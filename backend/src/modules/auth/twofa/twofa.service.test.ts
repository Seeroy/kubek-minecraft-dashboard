import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
} from "bun:test";
import type { Database } from "bun:sqlite";
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { IUser } from "@shared/types/user.types";
import * as bcrypt from "bcryptjs";
import { generateSync } from "otplib";
import { ApiErrorCode } from "@/core/errors/error-codes";
import { AppEventsService } from "@/core/events/app-events.service";
import { testUser } from "@/testing/user";
import { AccountsService } from "@/modules/accounts/accounts.service";
import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import { ConfigService } from "@/modules/config/config.service";
import { AuditLogsRepository } from "@/modules/database/repositories/audit-logs.repository";
import { AuthChallengesRepository } from "@/modules/database/repositories/auth-challenges.repository";
import { ConfigRepository } from "@/modules/database/repositories/config.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { TelegramUsersRepository } from "@/modules/database/repositories/telegram-users.repository";
import { UserSessionsRepository } from "@/modules/database/repositories/user-sessions.repository";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import { PasswordRecheckService } from "@/modules/rate-limit/password-recheck.service";
import { RateLimitService } from "@/modules/rate-limit/rate-limit.service";
import { SessionsService } from "@/modules/sessions/sessions.service";
import { BotTwofaService } from "@/modules/telegram-bot/bot-twofa.service";
import { fake } from "@/testing/fake";
import { memoryDatabase, sqliteProvider } from "@/testing/sqlite";
import { TwofaService } from "./twofa.service";

const SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const START = new Date("2026-01-01T00:00:00Z").getTime();
const ALICE_TG = 1001;
const BOB_TG = 2002;

let db: Database;
let users: UsersRepository;
let challenges: AuthChallengesRepository;
let telegramUsers: TelegramUsersRepository;
let sessions: SessionsService;
let telegramSent: boolean;
let twofa: TwofaService;

const code = () => generateSync({ secret: SECRET });
const wrongCode = () =>
  String((Number(code()) + 1) % 1_000_000).padStart(6, "0");
const user = (id: string) => users.findById(id)!;

function caught(fn: () => unknown): unknown {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error("expected a throw");
}

function account(id: string, extra: Partial<IUser> = {}): IUser {
  return testUser(id, { password: bcrypt.hashSync("pw", 4), ...extra });
}

beforeEach(() => {
  setSystemTime(START);
  telegramSent = true;
  db = memoryDatabase();
  const sqlite = sqliteProvider(db);
  users = new UsersRepository(sqlite);
  challenges = new AuthChallengesRepository(sqlite);
  telegramUsers = new TelegramUsersRepository(sqlite);
  const accounts = new AccountsService(users);
  const servers = new ServersRepository(sqlite);
  const events = new AppEventsService();
  const rateLimit = new RateLimitService(
    events,
    new AuditLogService(new AuditLogsRepository(sqlite), servers),
  );
  sessions = new SessionsService(
    new UserSessionsRepository(sqlite),
    accounts,
    new ExtensionEventBus(servers),
    events,
  );
  twofa = new TwofaService(
    challenges,
    telegramUsers,
    accounts,
    sessions,
    fake<BotTwofaService>({
      sendApprovalRequest: async (userId) =>
        telegramSent
          ? { chatId: telegramUsers.findByUserId(userId)!.id, messageId: 7 }
          : null,
    }),
    new ConfigService(new ConfigRepository(sqlite)),
    rateLimit,
    new PasswordRecheckService(rateLimit),
  );

  users.create(account("alice", { totpEnabled: true, totpSecret: SECRET }));
  users.create(account("bob"));
  users.create(account("carol", { telegram2faEnabled: true }));
  telegramUsers.create({
    id: ALICE_TG,
    userId: "carol",
    linkedAt: START,
    isActive: true,
  });
  telegramUsers.create({
    id: BOB_TG,
    userId: "bob",
    linkedAt: START,
    isActive: true,
  });
});

afterEach(() => {
  setSystemTime();
});

describe("TwofaService methods", () => {
  test("2FA is off for an account without methods", () => {
    expect(twofa.isEnabledFor(user("bob"))).toBe(false);
    expect(twofa.primaryMethod(user("bob"))).toBeNull();
  });

  test("primary falls back to an enabled method when the stored one is off", () => {
    const both = account("dave", {
      totpEnabled: true,
      totpSecret: SECRET,
      telegram2faEnabled: true,
      twofaPrimary: "telegram",
    });

    expect(twofa.primaryMethod(both)).toBe("telegram");
    expect(twofa.primaryMethod({ ...both, telegram2faEnabled: false })).toBe(
      "totp",
    );
  });

  test("challenge for a method the user has not enabled is rejected", async () => {
    await expect(
      twofa.startChallenge(user("alice"), "telegram", null, null),
    ).rejects.toThrow(BadRequestException);
  });
});

describe("TOTP challenge", () => {
  test("correct code issues a working session token", async () => {
    const challenge = await twofa.startChallenge(
      user("alice"),
      "totp",
      "10.0.0.1",
      "ua",
    );

    const { token, user: verified } = twofa.verifyTotpChallenge(
      challenge.id,
      code(),
    );

    expect(verified.id).toBe("alice");
    const auth = sessions.authenticate(token);
    expect(auth.user.id).toBe("alice");
    expect(auth.session.ip).toBe("10.0.0.1");
  });

  test("a challenge cannot be used twice", async () => {
    const challenge = await twofa.startChallenge(
      user("alice"),
      "totp",
      null,
      null,
    );
    twofa.verifyTotpChallenge(challenge.id, code());

    expect(() => twofa.verifyTotpChallenge(challenge.id, code())).toThrow(
      "Challenge is consumed",
    );
  });

  test("wrong code is a 401 that reports attempts left", async () => {
    const challenge = await twofa.startChallenge(
      user("alice"),
      "totp",
      null,
      null,
    );

    const err = caught(() =>
      twofa.verifyTotpChallenge(challenge.id, wrongCode()),
    );

    expect(err).toBeInstanceOf(UnauthorizedException);
    expect((err as UnauthorizedException).getResponse()).toEqual({
      code: ApiErrorCode.TOTP_INVALID,
      message: "Invalid code",
      attemptsLeft: 4,
    });
  });

  test("five wrong codes lock the challenge even for the right code", async () => {
    const challenge = await twofa.startChallenge(
      user("alice"),
      "totp",
      null,
      null,
    );
    for (let i = 0; i < 4; i++) {
      expect(() =>
        twofa.verifyTotpChallenge(challenge.id, wrongCode()),
      ).toThrow(UnauthorizedException);
    }

    expect(() => twofa.verifyTotpChallenge(challenge.id, wrongCode())).toThrow(
      "Too many attempts, challenge locked",
    );
    expect(() => twofa.verifyTotpChallenge(challenge.id, code())).toThrow(
      BadRequestException,
    );
  });

  test("failures carry over to the next challenge of the same account", async () => {
    for (let i = 0; i < 6; i++) {
      const challenge = await twofa.startChallenge(
        user("alice"),
        "totp",
        null,
        null,
      );
      expect(() =>
        twofa.verifyTotpChallenge(challenge.id, wrongCode()),
      ).toThrow(UnauthorizedException);
    }
    const fresh = await twofa.startChallenge(user("alice"), "totp", null, null);

    const err = caught(() => twofa.verifyTotpChallenge(fresh.id, code()));

    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(429);
  });

  test("expired challenge is rejected", async () => {
    const challenge = await twofa.startChallenge(
      user("alice"),
      "totp",
      null,
      null,
    );

    setSystemTime(START + 3 * 60_000 + 1);

    expect(() => twofa.verifyTotpChallenge(challenge.id, code())).toThrow(
      "Challenge expired",
    );
  });

  test("unknown challenge is a 404", () => {
    expect(() => twofa.verifyTotpChallenge("missing", code())).toThrow(
      NotFoundException,
    );
  });

  test("code from the authenticator cannot complete a telegram challenge", async () => {
    const challenge = await twofa.startChallenge(
      user("carol"),
      "telegram",
      null,
      null,
    );

    expect(() => twofa.verifyTotpChallenge(challenge.id, code())).toThrow(
      "Challenge requires a different method",
    );
  });

  test("switched away challenge cannot be completed anymore", async () => {
    users.update({ ...user("alice"), telegram2faEnabled: true });
    telegramUsers.update({
      id: ALICE_TG,
      userId: "alice",
      linkedAt: START,
      isActive: true,
    });
    const first = await twofa.startChallenge(user("alice"), "totp", null, null);

    const second = await twofa.switchChallenge(first.id, "telegram");

    expect(second.method).toBe("telegram");
    expect(() => twofa.verifyTotpChallenge(first.id, code())).toThrow(
      "Challenge is expired",
    );
  });
});

describe("Telegram challenge", () => {
  test("approval by the owner's Telegram hands out the token exactly once", async () => {
    const challenge = await twofa.startChallenge(
      user("carol"),
      "telegram",
      null,
      null,
    );

    expect(twofa.pollStatus(challenge.id)).toEqual({ status: "pending" });
    expect(
      twofa.resolveTelegramChallenge(challenge.id, "approve", ALICE_TG),
    ).toEqual({
      ok: true,
    });

    const polled = twofa.pollStatus(challenge.id);
    if (polled.status !== "approved") throw new Error(`got ${polled.status}`);
    expect(sessions.authenticate(polled.token).user.id).toBe("carol");
    expect(twofa.pollStatus(challenge.id)).toEqual({ status: "expired" });
  });

  test("another user's Telegram cannot approve the challenge", async () => {
    const challenge = await twofa.startChallenge(
      user("carol"),
      "telegram",
      null,
      null,
    );

    expect(
      twofa.resolveTelegramChallenge(challenge.id, "approve", BOB_TG),
    ).toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(twofa.pollStatus(challenge.id)).toEqual({ status: "pending" });
  });

  test("deactivated Telegram link cannot approve", async () => {
    const challenge = await twofa.startChallenge(
      user("carol"),
      "telegram",
      null,
      null,
    );
    telegramUsers.deactivate(ALICE_TG);

    expect(
      twofa.resolveTelegramChallenge(challenge.id, "approve", ALICE_TG),
    ).toEqual({
      ok: false,
      reason: "forbidden",
    });
  });

  test("denied challenge reports denied and issues no token", async () => {
    const challenge = await twofa.startChallenge(
      user("carol"),
      "telegram",
      null,
      null,
    );

    twofa.resolveTelegramChallenge(challenge.id, "deny", ALICE_TG);

    expect(twofa.pollStatus(challenge.id)).toEqual({ status: "denied" });
    expect(sessions.listForUser("carol")).toEqual([]);
  });

  test("expired challenge cannot be approved", async () => {
    const challenge = await twofa.startChallenge(
      user("carol"),
      "telegram",
      null,
      null,
    );

    setSystemTime(START + 4 * 60_000);

    expect(
      twofa.resolveTelegramChallenge(challenge.id, "approve", ALICE_TG),
    ).toEqual({
      ok: false,
      reason: "expired",
    });
    expect(twofa.pollStatus(challenge.id)).toEqual({ status: "expired" });
  });

  test("a TOTP challenge cannot be approved from Telegram", async () => {
    const challenge = await twofa.startChallenge(
      user("alice"),
      "totp",
      null,
      null,
    );

    expect(
      twofa.resolveTelegramChallenge(challenge.id, "approve", ALICE_TG),
    ).toEqual({
      ok: false,
      reason: "wrong_method",
    });
  });

  test("failed delivery drops the challenge", async () => {
    telegramSent = false;

    await expect(
      twofa.startChallenge(user("carol"), "telegram", null, null),
    ).rejects.toThrow("Failed to send the Telegram request");
    expect(db.query("SELECT id FROM auth_challenges").all()).toEqual([]);
  });
});

describe("TOTP setup", () => {
  test("confirming with a valid code enables TOTP", () => {
    setSystemTime(START);
    const { setupToken, secret } = twofa.beginTotpSetup(user("bob"));

    twofa.confirmTotpSetup(user("bob"), setupToken, generateSync({ secret }));

    expect(user("bob")).toMatchObject({
      totpEnabled: true,
      totpSecret: secret,
      twofaPrimary: "totp",
    });
  });

  test("setup token of one user cannot enable TOTP on another", () => {
    const { setupToken, secret } = twofa.beginTotpSetup(user("bob"));

    expect(() =>
      twofa.confirmTotpSetup(
        user("carol"),
        setupToken,
        generateSync({ secret }),
      ),
    ).toThrow(ForbiddenException);
    expect(user("carol").totpEnabled).toBe(false);
  });

  test("tampered setup token is rejected", () => {
    const { setupToken, secret } = twofa.beginTotpSetup(user("bob"));
    const [, sig] = setupToken.split(".");
    const forged = Buffer.from(
      JSON.stringify({ userId: "bob", secret: SECRET, exp: START + 60_000 }),
    ).toString("base64url");

    expect(() =>
      twofa.confirmTotpSetup(user("bob"), `${forged}.${sig}`, code()),
    ).toThrow("Bad setup token");
    expect(() =>
      twofa.confirmTotpSetup(user("bob"), "garbage", generateSync({ secret })),
    ).toThrow("Bad setup token");
    expect(() =>
      twofa.confirmTotpSetup(user("bob"), "garbage", code()),
    ).toThrow(BadRequestException);
  });

  test("setup token expires after ten minutes", () => {
    const { setupToken, secret } = twofa.beginTotpSetup(user("bob"));

    setSystemTime(START + 10 * 60_000 + 1);

    expect(() =>
      twofa.confirmTotpSetup(user("bob"), setupToken, generateSync({ secret })),
    ).toThrow("Setup token expired");
    expect(() =>
      twofa.confirmTotpSetup(user("bob"), setupToken, generateSync({ secret })),
    ).toThrow(BadRequestException);
  });

  test("wrong code does not enable TOTP", () => {
    const { setupToken } = twofa.beginTotpSetup(user("bob"));

    let err: unknown;
    try {
      twofa.confirmTotpSetup(user("bob"), setupToken, "000000");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(BadRequestException);
    expect((err as BadRequestException).getResponse()).toMatchObject({
      code: ApiErrorCode.TOTP_INVALID,
    });
    expect(user("bob").totpEnabled).toBe(false);
  });

  test("disabling TOTP needs the account password", async () => {
    await expect(
      twofa.disableTotp(user("alice"), "not it", null),
    ).rejects.toThrow(BadRequestException);
    expect(user("alice").totpEnabled).toBe(true);

    await twofa.disableTotp(user("alice"), "pw", null);
    expect(user("alice")).toMatchObject({
      totpEnabled: false,
      totpSecret: null,
    });
  });

  test("telegram 2FA needs a linked Telegram account", () => {
    users.create(account("erin"));

    expect(() => twofa.enableTelegram(user("erin"))).toThrow(
      "Link your Telegram account first",
    );

    twofa.enableTelegram(user("bob"));
    expect(user("bob")).toMatchObject({
      telegram2faEnabled: true,
      twofaPrimary: "telegram",
    });
  });
});
