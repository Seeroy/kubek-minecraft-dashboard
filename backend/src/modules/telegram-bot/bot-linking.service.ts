import { getErrorMessage } from "@/core/utils/error";
import { RateLimitService } from "@/modules/rate-limit/rate-limit.service";
import { AccountsService } from "@/modules/accounts/accounts.service";
import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import { OtpCodesRepository } from "@/modules/database/repositories/otp-codes.repository";
import { TelegramUsersRepository } from "@/modules/database/repositories/telegram-users.repository";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import type {
  IOtpCode,
  ITelegramUser,
  TelegramLang,
} from "@/modules/telegram-bot/telegram.types";
import {
  AuditAction,
  AuditCategory,
  AuditResult,
} from "@shared/types/audit.types";
import { createHash, randomInt, randomUUID } from "crypto";
import type { MyContext } from "./bot-types";
import { BotViewsService } from "./bot-views.service";
import { detectLang, t } from "./i18n";

type TelegramFrom = NonNullable<MyContext["from"]>;

// Who did something in the panel, for audit entries written outside interceptors
export interface PanelActor {
  userId: string;
  username: string;
  ip: string | null;
  userAgent: string | null;
}

// What we know about a Telegram user for the audit log
export function telegramProfile(from: TelegramFrom) {
  return {
    telegramId: from.id,
    telegramUsername: from.username ?? null,
    firstName: from.first_name ?? null,
    lastName: from.last_name ?? null,
    languageCode: from.language_code ?? null,
    isPremium: !!from.is_premium,
  };
}

export function telegramDisplayName(user: {
  id: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  if (user.username) return `@${user.username}`;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name || String(user.id);
}

/**
 * Account linking: OTP generation/validation and the chat-side linking flow
 */
@Injectable()
export class BotLinkingService {
  private readonly logger = new Logger(BotLinkingService.name);
  private readonly OTP_EXPIRY_MS = 2 * 60 * 1000;

  constructor(
    private readonly accountsService: AccountsService,
    private readonly telegramUsersRepo: TelegramUsersRepository,
    private readonly otpCodesRepo: OtpCodesRepository,
    private readonly views: BotViewsService,
    private readonly audit: AuditLogService,
    private readonly rateLimit: RateLimitService,
    private readonly usersRepo: UsersRepository,
  ) {}

  /** Generate a fresh OTP for the dashboard to display */
  generateOtp(userId: string): {
    otp: string;
    otpId: string;
    expiresAt: number;
  } {
    this.otpCodesRepo.deleteExpired();
    const otp = randomInt(100000, 1000000).toString();
    const codeHash = createHash("sha256").update(otp).digest("hex");
    const otpRecord: IOtpCode = {
      id: randomUUID(),
      userId,
      codeHash,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.OTP_EXPIRY_MS,
      used: false,
    };
    this.otpCodesRepo.create(otpRecord);
    return { otp, otpId: otpRecord.id, expiresAt: otpRecord.expiresAt };
  }

  /** Validate an OTP entered on the dashboard (consumes it on success) */
  validateOtp(userId: string, otpCode: string): boolean {
    this.rateLimit.check("telegram.otp", userId);
    const codeHash = createHash("sha256").update(otpCode).digest("hex");
    const otpRecord = this.otpCodesRepo.findValidByUserId(userId);
    if (!otpRecord || otpRecord.codeHash !== codeHash) {
      this.rateLimit.fail("telegram.otp", userId, { userId, ip: null });
      return false;
    }
    this.rateLimit.succeed("telegram.otp", userId);
    this.otpCodesRepo.markAsUsed(otpRecord.id);
    return true;
  }

  /** Handle a 6-digit code sent in chat to link the account */
  async handleOtpCode(
    ctx: MyContext,
    lang: TelegramLang,
    otpCode: string,
  ): Promise<void> {
    const from = ctx.from;
    const telegramId = from?.id;
    if (!from || !telegramId) return;

    const profile = telegramProfile(from);
    const displayName = telegramDisplayName({
      id: from.id,
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
    });
    const recordLink = (
      account: { id: string; username: string } | null,
      details: Record<string, unknown>,
      error?: string,
    ) =>
      this.audit.record({
        action: AuditAction.TELEGRAM_LINK,
        category: AuditCategory.TELEGRAM,
        resourceType: "telegram_user",
        resourceId: String(telegramId),
        resourceName: displayName,
        userId: account?.id ?? null,
        username: account?.username ?? displayName,
        details: { ...profile, ...details },
        result: error ? AuditResult.FAILED : AuditResult.SUCCESS,
        error: error ?? null,
        source: "telegram",
      });

    const limitKey = `tg:${telegramId}`;
    const wait = this.rateLimit.waitSeconds("telegram.otp", limitKey);
    if (wait > 0) {
      return void ctx.reply(
        t(lang, "otp.tooMany", { minutes: Math.ceil(wait / 60) }),
      );
    }

    try {
      const codeHash = createHash("sha256").update(otpCode).digest("hex");
      const otpRecord = this.otpCodesRepo
        .findAll()
        .find(
          (otp) =>
            otp.codeHash === codeHash &&
            otp.expiresAt > Date.now() &&
            !otp.used,
        );

      if (!otpRecord) {
        // The chat user is not a panel account, nobody gets a lock notice
        this.rateLimit.fail("telegram.otp", limitKey, { ip: null });
        recordLink(null, {}, "Invalid or expired code");
        return void ctx.reply(t(lang, "otp.invalid"));
      }

      this.rateLimit.succeed("telegram.otp", limitKey);
      const account = this.accountsService.findById(otpRecord.userId);
      const otpDetails = {
        otpId: otpRecord.id,
        otpIssuedBy: account?.username ?? null,
        otpIssuedAt: otpRecord.createdAt,
      };
      const actor = account
        ? { id: account.id, username: account.username }
        : null;

      const existingLink = this.telegramUsersRepo.findByUserId(
        otpRecord.userId,
      );
      if (
        existingLink &&
        existingLink.isActive &&
        existingLink.id !== telegramId
      ) {
        recordLink(
          actor,
          otpDetails,
          "Account is already linked to another Telegram user",
        );
        return void ctx.reply(t(lang, "otp.accountLinkedElsewhere"));
      }
      const existingTelegramLink = this.telegramUsersRepo.findById(telegramId);
      if (
        existingTelegramLink &&
        existingTelegramLink.isActive &&
        existingTelegramLink.userId !== otpRecord.userId
      ) {
        recordLink(
          actor,
          otpDetails,
          "Telegram user is already linked to another account",
        );
        return void ctx.reply(t(lang, "otp.telegramLinkedElsewhere"));
      }

      const telegramUser: ITelegramUser = {
        id: telegramId,
        userId: otpRecord.userId,
        username: ctx.from?.username,
        firstName: ctx.from?.first_name,
        lastName: ctx.from?.last_name,
        linkedAt: Date.now(),
        isActive: true,
        // Keep an existing preference, otherwise detect from the Telegram client
        language:
          existingTelegramLink?.language ?? detectLang(ctx.from?.language_code),
      };

      if (existingTelegramLink) this.telegramUsersRepo.update(telegramUser);
      else this.telegramUsersRepo.create(telegramUser);
      this.otpCodesRepo.markAsUsed(otpRecord.id);
      recordLink(actor, { ...otpDetails, relinked: !!existingTelegramLink });

      const linkedLang = telegramUser.language ?? lang;
      await ctx.reply(t(linkedLang, "otp.success"));
      await this.views.sendMainMenu(ctx, linkedLang, false);
    } catch (error) {
      this.logger.error(`Error linking account: ${getErrorMessage(error)}`);
      await ctx.reply(t(lang, "otp.failed"));
    }
  }

  /** Linked users with their resolved account names (admin view) */
  getLinkedUsers(): Array<{
    telegramUser: ITelegramUser;
    accountName: string;
    accountSkinName: string | null;
  }> {
    return this.telegramUsersRepo
      .findAll()
      .filter((user) => user.isActive)
      .map((telegramUser) => {
        const account = this.accountsService.findById(telegramUser.userId);
        return {
          telegramUser,
          accountName: account ? account.username : "Unknown User",
          accountSkinName: account?.skinName ?? null,
        };
      });
  }

  /** Deactivate a link by Telegram id (admin-initiated) */
  unlinkUser(actor: PanelActor, telegramId: number): void {
    const telegramUser = this.telegramUsersRepo.findById(telegramId);
    if (!telegramUser) throw new NotFoundException("Telegram user not found");
    this.telegramUsersRepo.deactivate(telegramId);
    this.recordUnlink(telegramUser, actor);
  }

  /** The user unlinked themselves with /unlink */
  unlinkSelf(telegramUser: ITelegramUser): void {
    this.telegramUsersRepo.deactivate(telegramUser.id);
    this.recordUnlink(telegramUser, null);
  }

  // actor is null when the user unlinked themselves with /unlink
  private recordUnlink(
    telegramUser: ITelegramUser,
    actor: PanelActor | null,
  ): void {
    const owner =
      this.usersRepo.findById(telegramUser.userId)?.username ?? "unknown";
    this.audit.record({
      action: AuditAction.TELEGRAM_UNLINK,
      category: AuditCategory.TELEGRAM,
      resourceType: "telegram_user",
      resourceId: String(telegramUser.id),
      resourceName: telegramDisplayName(telegramUser),
      userId: actor?.userId ?? telegramUser.userId,
      username: actor?.username ?? owner,
      details: {
        telegramId: telegramUser.id,
        telegramUsername: telegramUser.username ?? null,
        firstName: telegramUser.firstName ?? null,
        lastName: telegramUser.lastName ?? null,
        linkedAccount: owner,
        linkedAt: telegramUser.linkedAt,
      },
      result: AuditResult.SUCCESS,
      ip: actor?.ip ?? null,
      userAgent: actor?.userAgent ?? null,
      source: actor ? "panel" : "telegram",
    });
  }
}
