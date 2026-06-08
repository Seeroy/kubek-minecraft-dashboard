import { TelegramUsersRepository } from "@/modules/database/repositories/telegram-users.repository";
import { Injectable } from "@nestjs/common";
import type { ITelegramUser, TelegramLang } from "@/modules/telegram-bot/telegram.types";
import type { MyContext } from "./bot-types";
import { detectLang } from "./i18n";

/**
 * Resolves the linked Telegram user and preferred language for a context
 */
@Injectable()
export class BotUsersService {
  constructor(private readonly telegramUsersRepo: TelegramUsersRepository) {}

  /** The active linked user for this context, or null when unlinked */
  getActiveUser(ctx: MyContext): ITelegramUser | null {
    const telegramId = ctx.from?.id;
    if (!telegramId) return null;
    const user = this.telegramUsersRepo.findById(telegramId);
    return user && user.isActive ? user : null;
  }

  /** Stored preference if linked, otherwise detect from the Telegram client */
  langFor(ctx: MyContext): TelegramLang {
    return (
      this.getActiveUser(ctx)?.language ?? detectLang(ctx.from?.language_code)
    );
  }

  /** Persist a language preference for the active user (no-op when unlinked) */
  setLanguage(ctx: MyContext, lang: TelegramLang): void {
    const tgUser = this.getActiveUser(ctx);
    if (tgUser) this.telegramUsersRepo.update({ ...tgUser, language: lang });
  }
}
