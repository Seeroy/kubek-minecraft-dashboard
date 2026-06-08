import { asyncTimeout } from "@/core/utils/asyncTimeout";
import { getErrorMessage } from "@/core/utils/error";
import { ConfigService } from "@/modules/config/config.service";
import { autoRetry } from "@grammyjs/auto-retry";
import { limit } from "@grammyjs/ratelimiter";
import { run } from "@grammyjs/runner";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { ITelegramUser, TelegramLang } from "@/modules/telegram-bot/telegram.types";
import { Bot, GrammyError, session } from "grammy";
import { languageKeyboard } from "./bot-keyboards";
import { BotLinkingService } from "./bot-linking.service";
import { replyOrEdit } from "./bot-reply";
import { BotTwofaService, type TwofaResolver } from "./bot-twofa.service";
import type { MyContext, SessionData } from "./bot-types";
import { BotUsersService } from "./bot-users.service";
import { BotViewsService, type ServerControlAction } from "./bot-views.service";
import { CreateServerWizard } from "./create-server-wizard.service";
import { SUPPORTED_LANGS, t } from "./i18n";
import { NotificationService } from "./notification.service";

export type { TwofaResolver };

/**
 * Telegram bot orchestrator
 */
@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private bot: Bot<MyContext> | null = null;
  private runner: ReturnType<typeof run> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly users: BotUsersService,
    private readonly views: BotViewsService,
    private readonly linking: BotLinkingService,
    private readonly twofa: BotTwofaService,
    private readonly wizard: CreateServerWizard,
  ) {}

  onModuleInit() {
    void this.initializeBot();
  }

  onModuleDestroy() {
    if (this.runner) {
      this.runner.stop();
      this.runner = null;
    }
    if (this.bot) {
      this.bot = null;
      this.notificationService.setBot(null);
      this.twofa.setBot(null);
    }
  }

  private async initializeBot() {
    try {
      await asyncTimeout(1200);

      const telegramConfig = this.configService.get("telegramBot");
      if (!telegramConfig.enabled || !telegramConfig.token) return;

      this.bot = new Bot<MyContext>(telegramConfig.token);
      this.bot.api.config.use(autoRetry());
      this.bot.use(limit());
      this.bot.use(session({ initial: (): SessionData => ({}) }));

      this.registerCommands();
      this.registerCallbackHandlers();
      this.registerMessageHandlers();

      this.bot.catch((err) =>
        console.error("[TelegramBot] Handler error:", err),
      );

      await this.bot.init();
      await this.publishCommands();
      this.runner = run(this.bot);
    } catch (error: unknown) {
      console.error(
        "[TelegramBot] Failed to start bot:",
        error instanceof GrammyError
          ? error.error_code
          : getErrorMessage(error),
      );
      if (error instanceof GrammyError && error.error_code === 401) {
        console.error(
          "[TelegramBot] Invalid bot token provided. Bot will not start.",
        );
      }
      this.bot = null;
    }

    this.notificationService.setBot(this.bot);
    this.twofa.setBot(this.bot);
  }

  /** Register the localized command menu shown by Telegram clients */
  private async publishCommands() {
    if (!this.bot) return;
    const build = (lang: TelegramLang) =>
      (["start", "help", "servers", "language", "unlink"] as const).map(
        (command) => ({
          command,
          description: t(lang, `commands.${command}`),
        }),
      );
    try {
      await this.bot.api.setMyCommands(build("en"));
      await this.bot.api.setMyCommands(build("ru"), { language_code: "ru" });
    } catch {
      // Non-fatal: command hints just won't be set
    }
  }

  ///
  /// Commands
  ///

  private registerCommands() {
    if (!this.bot) return;

    this.bot.command("start", async (ctx) => {
      const lang = this.users.langFor(ctx);
      if (this.users.getActiveUser(ctx)) {
        await ctx.reply(t(lang, "start.welcomeBack"));
        await this.views.sendMainMenu(ctx, lang, false);
      } else {
        await ctx.reply(t(lang, "start.welcomeNew"), { parse_mode: "HTML" });
      }
    });

    this.bot.command("help", async (ctx) => {
      await ctx.reply(t(this.users.langFor(ctx), "help.text"), {
        parse_mode: "HTML",
      });
    });

    this.bot.command("language", async (ctx) => {
      const lang = this.users.langFor(ctx);
      await ctx.reply(t(lang, "language.choose"), {
        reply_markup: languageKeyboard(),
      });
    });

    this.bot.command("servers", async (ctx) => {
      const lang = this.users.langFor(ctx);
      const tgUser = this.users.getActiveUser(ctx);
      if (!tgUser) return void ctx.reply(t(lang, "common.linkFirst"));
      await this.views.sendServersPage(ctx, lang, tgUser.userId, 0, false);
    });

    this.bot.command("status", async (ctx) => {
      const lang = this.users.langFor(ctx);
      const tgUser = this.users.getActiveUser(ctx);
      if (!tgUser) return void ctx.reply(t(lang, "common.linkFirst"));
      const serverId = ctx.message?.text?.split(" ").slice(1)[0];
      if (!serverId)
        return void ctx.reply(t(lang, "status.usage"), { parse_mode: "HTML" });
      await this.views.sendServerStatus(
        ctx,
        lang,
        tgUser.userId,
        serverId,
        false,
      );
    });

    this.bot.command("unlink", async (ctx) => {
      const lang = this.users.langFor(ctx);
      const tgUser = this.users.getActiveUser(ctx);
      if (!tgUser) return void ctx.reply(t(lang, "unlink.notLinked"));
      this.linking.deactivate(tgUser.id);
      await ctx.reply(t(lang, "unlink.done"));
    });
  }

  ///
  /// Callback queries
  ///

  private registerCallbackHandlers() {
    if (!this.bot) return;

    this.bot.on("callback_query:data", async (ctx) => {
      const data = ctx.callbackQuery.data;
      const lang = this.users.langFor(ctx);

      // 2FA approval is handled before the link check (resolver enforces mapping)
      if (data.startsWith("2fa:")) {
        await this.twofa.handleCallback(ctx, lang, data);
        return;
      }

      // Language can be changed before/without an active link
      if (data === "menu:lang") {
        await replyOrEdit(
          ctx,
          true,
          t(lang, "language.choose"),
          languageKeyboard(),
        );
        return void ctx.answerCallbackQuery();
      }
      if (data.startsWith("lang:")) {
        await this.handleLanguageChange(ctx, data.slice("lang:".length));
        return;
      }

      const tgUser = this.users.getActiveUser(ctx);
      if (!tgUser) {
        return void ctx.answerCallbackQuery(t(lang, "common.linkFirst"));
      }

      try {
        if (data.startsWith("wiz:")) {
          await this.wizard.onCallback(
            ctx,
            lang,
            tgUser.userId,
            data.slice("wiz:".length),
          );
        } else if (data === "menu") {
          await this.views.sendMainMenu(ctx, lang, true);
        } else if (data.startsWith("srv:page:")) {
          await this.views.sendServersPage(
            ctx,
            lang,
            tgUser.userId,
            Number(data.split(":")[2]) || 0,
            true,
          );
        } else if (data.startsWith("srv:status:")) {
          await this.views.sendServerStatus(
            ctx,
            lang,
            tgUser.userId,
            data.split(":")[2],
            true,
          );
        } else if (/^srv:(start|stop|restart):/.test(data)) {
          const [, action, serverId] = data.split(":");
          await this.views.handleServerAction(
            ctx,
            lang,
            tgUser,
            serverId,
            action as ServerControlAction,
          );
        }
        await ctx.answerCallbackQuery();
      } catch (error) {
        console.error("[TelegramBot] Callback error:", error);
        await ctx.answerCallbackQuery(t(lang, "common.error"));
      }
    });
  }

  private async handleLanguageChange(ctx: MyContext, value: string) {
    const lang: TelegramLang = SUPPORTED_LANGS.includes(value as TelegramLang)
      ? (value as TelegramLang)
      : "en";
    this.users.setLanguage(ctx, lang);
    await ctx.answerCallbackQuery(t(lang, "language.changed"));
    await this.views.sendMainMenu(ctx, lang, true);
  }

  ///
  /// Messages (OTP linking + wizard name input)
  ///

  private registerMessageHandlers() {
    if (!this.bot) return;

    this.bot.on("message:text", async (ctx) => {
      const lang = this.users.langFor(ctx);
      const text = ctx.message.text;

      // While the wizard is collecting a name, consume the message there first
      if (
        this.wizard.isActive(ctx) &&
        (await this.wizard.onText(ctx, lang, text))
      )
        return;

      if (/^\d{6}$/.test(text)) {
        await this.linking.handleOtpCode(ctx, lang, text);
        return;
      }

      await ctx.reply(t(lang, "common.unknownCommand"));
    });
  }

  ///
  /// Public API (controller / 2FA / settings)
  ///

  generateOtp(userId: string): { otp: string; expiresAt: number } {
    return this.linking.generateOtp(userId);
  }

  validateOtp(userId: string, otpCode: string): boolean {
    return this.linking.validateOtp(userId, otpCode);
  }

  getLinkedUsers(): Array<{
    telegramUser: ITelegramUser;
    accountName: string;
  }> {
    return this.linking.getLinkedUsers();
  }

  unlinkUser(_adminUserId: string, telegramId: number): void {
    this.linking.unlinkUser(telegramId);
  }

  setTwofaResolver(resolver: TwofaResolver | null): void {
    this.twofa.setTwofaResolver(resolver);
  }

  sendApprovalRequest(
    userId: string,
    challengeId: string,
    meta: { username: string; ip: string | null; userAgent: string | null },
  ): Promise<{ chatId: number; messageId: number } | null> {
    return this.twofa.sendApprovalRequest(userId, challengeId, meta);
  }

  restartBot() {
    if (this.runner) {
      this.runner.stop();
      this.runner = null;
    }
    this.bot = null;
    void this.initializeBot();
  }

  isBotReady(): boolean {
    return this.bot !== null;
  }

  async getBotInfo(): Promise<{
    name: string;
    username: string;
    error?: string;
  }> {
    const telegramConfig = this.configService.get("telegramBot");
    if (!telegramConfig.enabled || !telegramConfig.token) {
      return {
        name: "",
        username: "",
        error: "Bot is not configured or disabled",
      };
    }
    if (!this.bot) return { name: "", username: "", error: "Bot not started" };
    try {
      const botInfo = await this.bot.api.getMe();
      return { name: botInfo.first_name, username: botInfo.username || "" };
    } catch (error) {
      console.error("[TelegramBot] Failed to get bot info:", error);
      if (error instanceof GrammyError && error.error_code === 401) {
        return { name: "", username: "", error: "Invalid bot token" };
      }
      return {
        name: "",
        username: "",
        error: "Network error or service unavailable",
      };
    }
  }
}
