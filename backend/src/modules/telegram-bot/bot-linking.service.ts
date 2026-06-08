import { AccountsService } from "@/modules/accounts/accounts.service";
import { OtpCodesRepository } from "@/modules/database/repositories/otp-codes.repository";
import { TelegramUsersRepository } from "@/modules/database/repositories/telegram-users.repository";
import { Injectable } from "@nestjs/common";
import type {
  IOtpCode,
  ITelegramUser,
  TelegramLang,
} from "@/modules/telegram-bot/telegram.types";
import { createHash, randomUUID } from "crypto";
import type { MyContext } from "./bot-types";
import { BotViewsService } from "./bot-views.service";
import { detectLang, t } from "./i18n";

/**
 * Account linking: OTP generation/validation and the chat-side linking flow
 */
@Injectable()
export class BotLinkingService {
  private readonly OTP_EXPIRY_MS = 2 * 60 * 1000;

  constructor(
    private readonly accountsService: AccountsService,
    private readonly telegramUsersRepo: TelegramUsersRepository,
    private readonly otpCodesRepo: OtpCodesRepository,
    private readonly views: BotViewsService,
  ) {}

  /** Generate a fresh OTP for the dashboard to display */
  generateOtp(userId: string): { otp: string; expiresAt: number } {
    this.otpCodesRepo.deleteExpired();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = createHash("sha256").update(otp).digest("hex");
    const otpRecord: IOtpCode = {
      id: randomUUID(),
      userId,
      codeHash,
      telegramId: undefined,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.OTP_EXPIRY_MS,
      used: false,
    };
    this.otpCodesRepo.create(otpRecord);
    return { otp, expiresAt: otpRecord.expiresAt };
  }

  /** Validate an OTP entered on the dashboard (consumes it on success) */
  validateOtp(userId: string, otpCode: string): boolean {
    const codeHash = createHash("sha256").update(otpCode).digest("hex");
    const otpRecord = this.otpCodesRepo.findValidByUserId(userId);
    if (!otpRecord || otpRecord.codeHash !== codeHash) return false;
    this.otpCodesRepo.markAsUsed(otpRecord.id);
    return true;
  }

  /** Handle a 6-digit code sent in chat to link the account */
  async handleOtpCode(
    ctx: MyContext,
    lang: TelegramLang,
    otpCode: string,
  ): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

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

      if (!otpRecord) return void ctx.reply(t(lang, "otp.invalid"));

      const existingLink = this.telegramUsersRepo.findByUserId(
        otpRecord.userId,
      );
      if (
        existingLink &&
        existingLink.isActive &&
        existingLink.id !== telegramId
      ) {
        return void ctx.reply(t(lang, "otp.accountLinkedElsewhere"));
      }
      const existingTelegramLink = this.telegramUsersRepo.findById(telegramId);
      if (
        existingTelegramLink &&
        existingTelegramLink.isActive &&
        existingTelegramLink.userId !== otpRecord.userId
      ) {
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

      const linkedLang = telegramUser.language ?? lang;
      await ctx.reply(t(linkedLang, "otp.success"));
      await this.views.sendMainMenu(ctx, linkedLang, false);
    } catch (error) {
      console.error("[TelegramBot] Error linking account:", error);
      await ctx.reply(t(lang, "otp.failed"));
    }
  }

  /** Linked users with their resolved account names (admin view) */
  getLinkedUsers(): Array<{
    telegramUser: ITelegramUser;
    accountName: string;
  }> {
    return this.telegramUsersRepo
      .findAll()
      .filter((user) => user.isActive)
      .map((telegramUser) => {
        const account = this.accountsService.findById(telegramUser.userId);
        return {
          telegramUser,
          accountName: account ? account.username : "Unknown User",
        };
      });
  }

  /** Deactivate a link by Telegram id (admin-initiated) */
  unlinkUser(telegramId: number): void {
    const telegramUser = this.telegramUsersRepo.findById(telegramId);
    if (!telegramUser) throw new Error("Telegram user not found");
    this.telegramUsersRepo.deactivate(telegramId);
  }

  /** Deactivate a link by its primary id (used by the /unlink command) */
  deactivate(id: number): void {
    this.telegramUsersRepo.deactivate(id);
  }
}
