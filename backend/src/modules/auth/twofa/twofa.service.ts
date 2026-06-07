import { ApiErrorCode } from "@/core/errors/error-codes";
import { AccountsService } from "@/modules/accounts/accounts.service";
import { ConfigService } from "@/modules/config/config.service";
import {
  AuthChallengesRepository,
  type IAuthChallenge,
} from "@/modules/database/repositories/auth-challenges.repository";
import { TelegramUsersRepository } from "@/modules/database/repositories/telegram-users.repository";
import { SessionsService } from "@/modules/sessions/sessions.service";
import { TelegramBotService } from "@/modules/telegram-bot/telegram-bot.service";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from "@nestjs/common";
import type { IUser, TwoFactorMethod } from "@shared/types/user.types";
import * as bcrypt from "bcryptjs";
import { createHmac, randomBytes, randomUUID } from "crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import * as qrcode from "qrcode";

const CHALLENGE_TTL_MS = 3 * 60 * 1000;
const SETUP_TOKEN_TTL_MS = 10 * 60 * 1000;
const TOTP_ISSUER = "Kubek";
const MAX_TOTP_ATTEMPTS = 5;
const SETUP_SECRET_CONFIG_KEY = "twofaSetupSecret";

interface SetupTokenPayload {
  userId: string;
  secret: string;
  exp: number;
}

@Injectable()
export class TwofaService implements OnModuleInit {
  private readonly logger = new Logger(TwofaService.name);
  private setupSecretCache: string | null = null;

  constructor(
    private readonly challenges: AuthChallengesRepository,
    private readonly telegramUsers: TelegramUsersRepository,
    private readonly accounts: AccountsService,
    private readonly sessions: SessionsService,
    private readonly telegramBot: TelegramBotService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    this.telegramBot.setTwofaResolver((challengeId, decision, telegramId) =>
      this.resolveTelegramChallenge(challengeId, decision, telegramId),
    );
    this.setupSecretCache = this.loadOrCreateSetupSecret();
  }

  isEnabledFor(user: IUser): boolean {
    return !!(user.totpEnabled || user.telegram2faEnabled);
  }

  enabledMethods(user: IUser): TwoFactorMethod[] {
    const methods: TwoFactorMethod[] = [];
    if (user.totpEnabled) methods.push("totp");
    if (user.telegram2faEnabled) methods.push("telegram");
    return methods;
  }

  primaryMethod(user: IUser): TwoFactorMethod | null {
    const methods = this.enabledMethods(user);
    if (methods.length === 0) return null;
    if (user.twofaPrimary && methods.includes(user.twofaPrimary))
      return user.twofaPrimary;
    return methods[0];
  }

  /** Create a challenge for the primary method and (for telegram) send the request */
  async startChallenge(
    user: IUser,
    method: TwoFactorMethod,
    ip: string | null,
    userAgent: string | null,
  ): Promise<IAuthChallenge> {
    if (!this.enabledMethods(user).includes(method)) {
      throw new BadRequestException("2FA method is not enabled for this user");
    }

    this.challenges.deleteExpired();

    const now = Date.now();
    const challenge: IAuthChallenge = {
      id: randomUUID(),
      userId: user.id,
      method,
      status: "pending",
      tgChatId: null,
      tgMessageId: null,
      ip,
      userAgent,
      issuedToken: null,
      createdAt: now,
      expiresAt: now + CHALLENGE_TTL_MS,
      resolvedAt: null,
      attempts: 0,
    };
    this.challenges.create(challenge);

    if (method === "telegram") {
      try {
        const sent = await this.telegramBot.sendApprovalRequest(
          user.id,
          challenge.id,
          {
            username: user.username,
            ip,
            userAgent,
          },
        );
        if (sent) {
          challenge.tgChatId = sent.chatId;
          challenge.tgMessageId = sent.messageId;
          this.challenges.update(challenge);
        } else {
          this.challenges.delete(challenge.id);
          throw new BadRequestException("Failed to send the Telegram request");
        }
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        this.logger.error("Failed to send Telegram approval", err as Error);
        this.challenges.delete(challenge.id);
        throw new BadRequestException("Failed to send the Telegram request");
      }
    }

    return challenge;
  }

  async switchChallenge(
    challengeId: string,
    method: TwoFactorMethod,
  ): Promise<IAuthChallenge> {
    const existing = this.requirePending(challengeId);
    const user = this.accounts.findById(existing.userId);
    if (!user) throw new NotFoundException("User not found");

    if (!this.enabledMethods(user).includes(method)) {
      throw new BadRequestException("2FA method is not enabled for this user");
    }

    // Mark old challenge as expired so it can't be reused
    existing.status = "expired";
    existing.resolvedAt = Date.now();
    this.challenges.update(existing);

    return this.startChallenge(user, method, existing.ip, existing.userAgent);
  }

  /** Verify a TOTP code within a challenge and return the session token */
  verifyTotpChallenge(
    challengeId: string,
    code: string,
  ): { token: string; user: IUser } {
    const challenge = this.requirePending(challengeId);
    if (challenge.method !== "totp") {
      throw new BadRequestException("Challenge requires a different method");
    }
    const user = this.accounts.findById(challenge.userId);
    if (!user || !user.totpEnabled || !user.totpSecret) {
      throw new BadRequestException("TOTP is not configured for this account");
    }
    if (!this.verifyCode(user.totpSecret, code)) {
      challenge.attempts += 1;
      const attemptsLeft = Math.max(0, MAX_TOTP_ATTEMPTS - challenge.attempts);
      if (challenge.attempts >= MAX_TOTP_ATTEMPTS) {
        challenge.status = "expired";
        challenge.resolvedAt = Date.now();
        this.challenges.update(challenge);
        throw new UnauthorizedException({
          code: ApiErrorCode.TOTP_LOCKED,
          message: "Too many attempts, challenge locked",
          attemptsLeft: 0,
        });
      }
      this.challenges.update(challenge);
      throw new UnauthorizedException({
        code: ApiErrorCode.TOTP_INVALID,
        message: "Invalid code",
        attemptsLeft,
      });
    }
    return this.consumeChallenge(challenge, user);
  }

  /** Resolve a telegram challenge from the bot: approve/deny */
  resolveTelegramChallenge(
    challengeId: string,
    decision: "approve" | "deny",
    telegramId: number,
  ): { ok: boolean; reason?: string } {
    const challenge = this.challenges.findById(challengeId);
    if (!challenge) return { ok: false, reason: "not_found" };
    if (challenge.status !== "pending")
      return { ok: false, reason: challenge.status };
    if (challenge.expiresAt < Date.now()) {
      challenge.status = "expired";
      challenge.resolvedAt = Date.now();
      this.challenges.update(challenge);
      return { ok: false, reason: "expired" };
    }
    if (challenge.method !== "telegram")
      return { ok: false, reason: "wrong_method" };

    const tgUser = this.telegramUsers.findById(telegramId);
    if (!tgUser || !tgUser.isActive || tgUser.userId !== challenge.userId) {
      return { ok: false, reason: "forbidden" };
    }

    const user = this.accounts.findById(challenge.userId);
    if (!user) return { ok: false, reason: "no_user" };

    if (decision === "deny") {
      challenge.status = "denied";
      challenge.resolvedAt = Date.now();
      this.challenges.update(challenge);
      return { ok: true };
    }

    // approve - issue token and stash it; client will pick up via polling
    const { token } = this.sessions.create(
      user.id,
      challenge.ip,
      challenge.userAgent,
    );
    challenge.status = "approved";
    challenge.issuedToken = token;
    challenge.resolvedAt = Date.now();
    this.challenges.update(challenge);
    return { ok: true };
  }

  /** Poll challenge status, return the token exactly once and mark it consumed */
  pollStatus(
    challengeId: string,
  ):
    | { status: "pending" | "denied" | "expired" }
    | { status: "approved"; token: string; user: IUser } {
    const challenge = this.challenges.findById(challengeId);
    if (!challenge) return { status: "expired" };

    if (challenge.expiresAt < Date.now() && challenge.status === "pending") {
      challenge.status = "expired";
      challenge.resolvedAt = Date.now();
      this.challenges.update(challenge);
    }

    if (challenge.status === "approved") {
      const token = challenge.issuedToken!;
      const user = this.accounts.findById(challenge.userId);
      if (!user) return { status: "expired" };
      challenge.status = "consumed";
      challenge.issuedToken = null;
      this.challenges.update(challenge);
      return { status: "approved", token, user };
    }

    if (challenge.status === "denied") return { status: "denied" };
    if (challenge.status === "expired" || challenge.status === "consumed") {
      return { status: "expired" };
    }
    return { status: "pending" };
  }

  //
  // TOTP
  //

  beginTotpSetup(user: IUser): {
    secret: string;
    otpauthUrl: string;
    qrDataUrl: Promise<string>;
    setupToken: string;
  } {
    const secret = generateSecret();
    const otpauthUrl = generateURI({
      issuer: TOTP_ISSUER,
      label: user.username,
      secret,
    });
    const setupToken = this.signSetupToken({
      userId: user.id,
      secret,
      exp: Date.now() + SETUP_TOKEN_TTL_MS,
    });
    return {
      secret,
      otpauthUrl,
      qrDataUrl: qrcode.toDataURL(otpauthUrl),
      setupToken,
    };
  }

  confirmTotpSetup(user: IUser, setupToken: string, code: string): void {
    const payload = this.verifySetupToken(setupToken);
    if (payload.userId !== user.id) throw new ForbiddenException();
    if (!this.verifyCode(payload.secret, code)) {
      throw new UnauthorizedException("Invalid code");
    }
    const updated: IUser = {
      ...user,
      totpSecret: payload.secret,
      totpEnabled: true,
      twofaPrimary: user.twofaPrimary ?? "totp",
    };
    this.accounts.update(updated);
  }

  async disableTotp(user: IUser, password: string): Promise<void> {
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException("Invalid password");
    const updated: IUser = {
      ...user,
      totpSecret: null,
      totpEnabled: false,
      twofaPrimary:
        user.twofaPrimary === "totp"
          ? user.telegram2faEnabled
            ? "telegram"
            : null
          : (user.twofaPrimary ?? null),
    };
    this.accounts.update(updated);
  }

  enableTelegram(user: IUser): void {
    const tg = this.telegramUsers.findByUserId(user.id);
    if (!tg || !tg.isActive) {
      throw new BadRequestException("Link your Telegram account first");
    }
    const updated: IUser = {
      ...user,
      telegram2faEnabled: true,
      twofaPrimary: user.twofaPrimary ?? "telegram",
    };
    this.accounts.update(updated);
  }

  disableTelegram(user: IUser): void {
    const updated: IUser = {
      ...user,
      telegram2faEnabled: false,
      twofaPrimary:
        user.twofaPrimary === "telegram"
          ? user.totpEnabled
            ? "totp"
            : null
          : (user.twofaPrimary ?? null),
    };
    this.accounts.update(updated);
  }

  private requirePending(challengeId: string): IAuthChallenge {
    const c = this.challenges.findById(challengeId);
    if (!c) throw new NotFoundException("Challenge not found");
    if (c.status !== "pending") {
      throw new BadRequestException(`Challenge is ${c.status}`);
    }
    if (c.expiresAt < Date.now()) {
      c.status = "expired";
      c.resolvedAt = Date.now();
      this.challenges.update(c);
      throw new BadRequestException("Challenge expired");
    }
    return c;
  }

  private consumeChallenge(
    challenge: IAuthChallenge,
    user: IUser,
  ): { token: string; user: IUser } {
    const { token } = this.sessions.create(
      user.id,
      challenge.ip,
      challenge.userAgent,
    );
    challenge.status = "consumed";
    challenge.resolvedAt = Date.now();
    this.challenges.update(challenge);
    return { token, user };
  }

  private verifyCode(secret: string, code: string): boolean {
    try {
      const result = verifySync({ token: code, secret });
      return result.valid;
    } catch {
      return false;
    }
  }

  private setupSecret(): string {
    if (process.env.KUBEK_2FA_SETUP_SECRET)
      return process.env.KUBEK_2FA_SETUP_SECRET;
    if (this.setupSecretCache) return this.setupSecretCache;
    this.setupSecretCache = this.loadOrCreateSetupSecret();
    return this.setupSecretCache;
  }

  // Generate a per-install secret on first use and persist it
  private loadOrCreateSetupSecret(): string {
    if (process.env.KUBEK_2FA_SETUP_SECRET)
      return process.env.KUBEK_2FA_SETUP_SECRET;
    const existing = this.config.get(SETUP_SECRET_CONFIG_KEY);
    if (typeof existing === "string" && existing.length > 0) return existing;
    if (process.env.NODE_ENV === "production") {
      // Generate and persist is fine in dev
      this.logger.warn(
        "KUBEK_2FA_SETUP_SECRET is not set; generating and persisting one",
      );
    }
    const generated = randomBytes(32).toString("hex");
    this.config.set(SETUP_SECRET_CONFIG_KEY, generated);
    return generated;
  }

  private signSetupToken(payload: SetupTokenPayload): string {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = createHmac("sha256", this.setupSecret())
      .update(body)
      .digest("base64url");
    return `${body}.${sig}`;
  }

  private verifySetupToken(token: string): SetupTokenPayload {
    const [body, sig] = token.split(".");
    if (!body || !sig) throw new UnauthorizedException("Bad setup token");
    const expected = createHmac("sha256", this.setupSecret())
      .update(body)
      .digest("base64url");
    if (expected !== sig) throw new UnauthorizedException("Bad setup token");
    let parsed: SetupTokenPayload;
    try {
      parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    } catch {
      throw new UnauthorizedException("Bad setup token");
    }
    if (parsed.exp < Date.now())
      throw new UnauthorizedException("Setup token expired");
    return parsed;
  }
}
