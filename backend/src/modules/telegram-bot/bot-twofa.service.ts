import { TelegramUsersRepository } from "@/modules/database/repositories/telegram-users.repository";
import { Injectable } from "@nestjs/common";
import type { TelegramLang } from "@/modules/telegram-bot/telegram.types";
import { Bot, InlineKeyboard } from "grammy";
import { escapeHtml } from "./bot-reply";
import type { MyContext } from "./bot-types";
import { t } from "./i18n";

export type TwofaResolver = (
  challengeId: string,
  decision: "approve" | "deny",
  telegramId: number,
) => { ok: boolean; reason?: string };

/**
 * Telegram-driven 2FA: relays approval requests and resolves inline decisions
 */
@Injectable()
export class BotTwofaService {
  private bot: Bot<MyContext> | null = null;
  private resolver: TwofaResolver | null = null;

  constructor(private readonly telegramUsersRepo: TelegramUsersRepository) {}

  setBot(bot: Bot<MyContext> | null): void {
    this.bot = bot;
  }

  setTwofaResolver(resolver: TwofaResolver | null): void {
    this.resolver = resolver;
  }

  /** Handle 2fa callback */
  async handleCallback(
    ctx: MyContext,
    lang: TelegramLang,
    data: string,
  ): Promise<void> {
    const match = /^2fa:(approve|deny):(.+)$/.exec(data);
    if (!match) return;
    const decision = match[1] as "approve" | "deny";
    const challengeId = match[2];
    const tgId = ctx.from?.id;
    if (!tgId || !this.resolver) {
      return void ctx.answerCallbackQuery(t(lang, "twofa.serviceUnavailable"));
    }
    const result = this.resolver(challengeId, decision, tgId);
    if (!result.ok) {
      const key = `twofa.errors.${result.reason ?? "generic"}`;
      return void ctx.answerCallbackQuery(t(lang, key));
    }
    try {
      await ctx.editMessageText(
        t(lang, decision === "approve" ? "twofa.approved" : "twofa.denied"),
      );
    } catch {
      // message may be too old to edit
    }
    await ctx.answerCallbackQuery(
      t(
        lang,
        decision === "approve" ? "twofa.approvedShort" : "twofa.deniedShort",
      ),
    );
  }

  /** Send a 2FA approval request to a user's Telegram chat (localized) */
  async sendApprovalRequest(
    userId: string,
    challengeId: string,
    meta: { username: string; ip: string | null; userAgent: string | null },
  ): Promise<{ chatId: number; messageId: number } | null> {
    if (!this.bot) return null;
    const tgUser = this.telegramUsersRepo.findByUserId(userId);
    if (!tgUser || !tgUser.isActive) return null;

    const lang = tgUser.language ?? "en";
    const text = t(lang, "twofa.request", {
      username: escapeHtml(meta.username),
      ip: escapeHtml(meta.ip ?? "?"),
      ua: escapeHtml((meta.userAgent ?? "?").slice(0, 120)),
    });
    const keyboard = new InlineKeyboard()
      .text(t(lang, "twofa.approve"), `2fa:approve:${challengeId}`)
      .text(t(lang, "twofa.deny"), `2fa:deny:${challengeId}`);

    try {
      const sent = await this.bot.api.sendMessage(tgUser.id, text, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
      return { chatId: tgUser.id, messageId: sent.message_id };
    } catch (err) {
      console.error("[TelegramBot] sendApprovalRequest failed:", err);
      return null;
    }
  }
}
