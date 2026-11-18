import { asyncTimeout } from "@/core/utils/asyncTimeout";
import { getErrorMessage } from "@/core/utils/error";
import { ConfigService } from "@/modules/config/config.service";
import { autoRetry } from "@grammyjs/auto-retry";
import { limit } from "@grammyjs/ratelimiter";
import { run } from "@grammyjs/runner";
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import type {
  ITelegramUser,
  TelegramLang,
} from "@/modules/telegram-bot/telegram.types";
import { Bot, GrammyError, session } from "grammy";
import { BotAlertsService } from "./bot-alerts.service";
import { languageKeyboard } from "./bot-keyboards";
import { BotAssistantService } from "./bot-assistant.service";
import { BotLinkingService } from "./bot-linking.service";
import { replyOrEdit } from "./bot-reply";
import { BotTwofaService } from "./bot-twofa.service";
import type { MyContext, SessionData } from "./bot-types";
import { BotUsersService } from "./bot-users.service";
import { BotViewsService, type ServerControlAction } from "./bot-views.service";
import { CreateServerWizard } from "./create-server-wizard.service";
import { SUPPORTED_LANGS, t } from "./i18n";
import { TelegramNotifier } from "./telegram-notifier";

export interface BotInfo {
  id?: number;
  name: string;
  username: string;
  hasAvatar?: boolean;
  error?: string;
}

interface CallbackScope {
  ctx: MyContext;
  lang: TelegramLang;
  data: string;
  /** Callback data without the route prefix */
  rest: string;
}

interface LinkedCallbackScope extends CallbackScope {
  tgUser: ITelegramUser;
}

type CallbackRoute<S> = {
  /** Exact match, or prefix if it ends with ":" */
  match: string;
  handle: (scope: S) => Promise<void>;
};

// Whole data, or its start for routes ending with ":"
function findRoute<S>(
  routes: CallbackRoute<S>[],
  data: string,
): { route: CallbackRoute<S>; rest: string } | null {
  for (const route of routes) {
    if (
      route.match.endsWith(":")
        ? data.startsWith(route.match)
        : data === route.match
    ) {
      return { route, rest: data.slice(route.match.length) };
    }
  }
  return null;
}

/**
 * Telegram bot orchestrator
 */
@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: Bot<MyContext> | null = null;
  private runner: ReturnType<typeof run> | null = null;
  // Pending start, info requests wait for it instead of reporting "not started"
  private starting: Promise<void> | null = null;
  // Why the last start failed, shown instead of a bare "not started"
  private startError: string | null = null;
  private avatar: { fileUniqueId: string; data: Buffer; mime: string } | null =
    null;

  constructor(
    private readonly configService: ConfigService,
    private readonly notifier: TelegramNotifier,
    private readonly users: BotUsersService,
    private readonly views: BotViewsService,
    private readonly linking: BotLinkingService,
    private readonly twofa: BotTwofaService,
    private readonly wizard: CreateServerWizard,
    private readonly assistant: BotAssistantService,
    private readonly alerts: BotAlertsService,
  ) {}

  onModuleInit() {
    void this.start(1200);
  }

  private start(delayMs = 0): Promise<void> {
    const starting = this.initializeBot(delayMs).finally(() => {
      if (this.starting === starting) this.starting = null;
    });
    this.starting = starting;
    return starting;
  }

  onModuleDestroy() {
    if (this.runner) {
      void this.runner.stop();
      this.runner = null;
    }
    if (this.bot) {
      this.bot = null;
      this.notifier.setBot(null);
      this.assistant.setBot(null);
      this.twofa.setBot(null);
    }
  }

  private async initializeBot(delayMs: number) {
    this.startError = null;
    try {
      if (delayMs > 0) await asyncTimeout(delayMs);

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
        this.logger.error(`Handler error: ${getErrorMessage(err.error)}`),
      );

      await this.bot.init();
      await this.publishCommands();
      this.runner = run(this.bot);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to start bot: ${
          error instanceof GrammyError
            ? error.error_code
            : getErrorMessage(error)
        }`,
      );
      if (error instanceof GrammyError && error.error_code === 401) {
        this.logger.error("Invalid bot token provided. Bot will not start.");
        this.startError = "Invalid bot token";
      } else {
        this.startError = "Network error or service unavailable";
      }
      this.bot = null;
    }

    this.notifier.setBot(this.bot);
    this.assistant.setBot(this.bot);
    this.twofa.setBot(this.bot);
  }

  /** Register the localized command menu shown by Telegram clients */
  private async publishCommands() {
    if (!this.bot) return;
    const commands = (
      ["start", "help", "servers", "status", "new", "language", "unlink"] as const
    ).filter((command) => command !== "new" || this.assistant.isEnabled());
    const build = (lang: TelegramLang) =>
      commands.map((command) => ({
        command,
        description: t(lang, `commands.${command}`),
      }));
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
      const assistant = this.assistant.isEnabled();
      await ctx.reply(t(this.users.langFor(ctx), "help.text", { assistant }), {
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

    this.bot.command("new", async (ctx) => {
      const lang = this.users.langFor(ctx);
      const tgUser = this.users.getActiveUser(ctx);
      if (!tgUser) return void ctx.reply(t(lang, "common.linkFirst"));
      if (!this.assistant.userFor(tgUser))
        return void ctx.reply(t(lang, "common.unknownCommand"));
      await this.assistant.newChat(ctx, lang, tgUser);
    });

    this.bot.command("unlink", async (ctx) => {
      const lang = this.users.langFor(ctx);
      const tgUser = this.users.getActiveUser(ctx);
      if (!tgUser) return void ctx.reply(t(lang, "unlink.notLinked"));
      this.linking.unlinkSelf(tgUser);
      await ctx.reply(t(lang, "unlink.done"));
    });
  }

  ///
  /// Callback queries
  ///

  // Before the link check, the 2FA resolver checks the user itself
  private readonly publicRoutes: CallbackRoute<CallbackScope>[] = [
    {
      match: "2fa:",
      handle: ({ ctx, lang, data }) =>
        this.twofa.handleCallback(ctx, lang, data),
    },
    {
      match: "menu:lang",
      handle: async ({ ctx, lang }) => {
        await replyOrEdit(
          ctx,
          true,
          t(lang, "language.choose"),
          languageKeyboard(),
        );
        await ctx.answerCallbackQuery();
      },
    },
    {
      match: "lang:",
      handle: ({ ctx, rest }) => this.handleLanguageChange(ctx, rest),
    },
  ];

  // These answer the query with their own result: power actions and alert buttons
  private readonly controlRoutes: CallbackRoute<LinkedCallbackScope>[] = [
    ...(["start", "stop", "restart"] as const).map(
      (action: ServerControlAction) => ({
        match: `srv:${action}:`,
        handle: ({ ctx, lang, tgUser, rest }: LinkedCallbackScope) =>
          this.views.handleServerAction(ctx, lang, tgUser, rest, action),
      }),
    ),
    ...(["notme", "revoke", "keep"] as const).map((step) => ({
      match: `sec:${step}:`,
      handle: ({ ctx, lang, tgUser, rest }: LinkedCallbackScope) =>
        this.alerts.handleLogin(ctx, lang, tgUser, step, rest),
    })),
    {
      match: "bk:retry:",
      handle: ({ ctx, lang, tgUser, rest }) =>
        this.alerts.retryBackup(ctx, lang, tgUser, rest),
    },
  ];

  // Router answers with an empty ack, or an error toast if it fails
  private readonly linkedRoutes: CallbackRoute<LinkedCallbackScope>[] = [
    {
      match: "wiz:",
      handle: ({ ctx, lang, tgUser, rest }) =>
        this.wizard.onCallback(ctx, lang, tgUser.userId, rest),
    },
    {
      match: "menu",
      handle: ({ ctx, lang }) => this.views.sendMainMenu(ctx, lang, true),
    },
    {
      match: "srv:page:",
      handle: ({ ctx, lang, tgUser, rest }) =>
        this.views.sendServersPage(
          ctx,
          lang,
          tgUser.userId,
          Number(rest.split(":")[0]) || 0,
          true,
        ),
    },
    {
      match: "srv:status:",
      handle: ({ ctx, lang, tgUser, rest }) => {
        // The opened server becomes what the assistant talks about
        this.assistant.rememberServer(tgUser.id, rest.split(":")[0]);
        return this.views.sendServerStatus(
          ctx,
          lang,
          tgUser.userId,
          rest.split(":")[0],
          true,
        );
      },
    },
  ];

  private registerCallbackHandlers() {
    if (!this.bot) return;

    this.bot.on("callback_query:data", async (ctx) => {
      const data = ctx.callbackQuery.data;
      const lang = this.users.langFor(ctx);

      const open = findRoute(this.publicRoutes, data);
      if (open) return open.route.handle({ ctx, lang, data, rest: open.rest });

      const tgUser = this.users.getActiveUser(ctx);
      if (!tgUser) {
        return void ctx.answerCallbackQuery(t(lang, "common.linkFirst"));
      }

      // Assistant buttons answer the query with their own result
      if (data.startsWith("ai:"))
        return this.assistant.onCallback(ctx, lang, tgUser, data.slice(3));

      const control = findRoute(this.controlRoutes, data);
      if (control && control.rest) {
        return control.route.handle({
          ctx,
          lang,
          data,
          tgUser,
          rest: control.rest,
        });
      }

      try {
        const linked = findRoute(this.linkedRoutes, data);
        if (linked) {
          await linked.route.handle({
            ctx,
            lang,
            data,
            tgUser,
            rest: linked.rest,
          });
        }
        await ctx.answerCallbackQuery();
      } catch (error) {
        this.logger.error(`Callback error: ${getErrorMessage(error)}`);
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

      // Anything else is a question for the assistant, if the user may chat with it
      const tgUser = this.users.getActiveUser(ctx);
      if (
        tgUser &&
        !text.startsWith("/") &&
        (await this.assistant.handleMessage(ctx, lang, tgUser, {
          text,
          messageId: ctx.message.message_id,
        }))
      )
        return;

      await ctx.reply(t(lang, "common.unknownCommand"));
    });

    this.bot.on(["message:photo", "message:document"], async (ctx) => {
      const lang = this.users.langFor(ctx);
      const tgUser = this.users.getActiveUser(ctx);
      if (!tgUser || !this.assistant.userFor(tgUser)) return;
      const message = ctx.message;
      const photo = message.photo?.at(-1);
      const document = message.document;
      const file = photo
        ? await this.assistant.readFile(lang, photo, `photo-${message.message_id}.jpg`, "image/jpeg")
        : document
          ? await this.assistant.readFile(
              lang,
              document,
              document.file_name ?? `file-${message.message_id}`,
              document.mime_type,
            )
          : null;
      if (!file) return;
      if (typeof file === "string") return void ctx.reply(file);
      const caption = message.caption ?? "";
      if (message.media_group_id) {
        this.assistant.handleAlbumPart(ctx, lang, tgUser, message.media_group_id, file, caption, message.message_id);
        return;
      }
      await this.assistant.handleMessage(ctx, lang, tgUser, {
        text: caption,
        attachments: [file],
        messageId: message.message_id,
      });
    });

    // The stop button Telegram shows under a streamed draft
    this.bot.on("stopped_message_generation", (ctx) => {
      const chatId = ctx.update.stopped_message_generation?.chat.id;
      if (chatId) this.assistant.handleStopped(chatId);
    });
  }

  ///
  /// Public API (settings)
  ///

  restartBot(): Promise<void> {
    if (this.runner) {
      void this.runner.stop();
      this.runner = null;
    }
    this.bot = null;
    this.avatar = null;
    return this.start();
  }

  /** The assistant was switched on or off, no restart needed */
  async applyAssistantSetting(): Promise<void> {
    if (!this.assistant.isEnabled()) this.assistant.stopAll();
    await this.publishCommands();
  }

  async getBotInfo(): Promise<BotInfo> {
    const telegramConfig = this.configService.get("telegramBot");
    if (!telegramConfig.enabled || !telegramConfig.token) {
      return {
        name: "",
        username: "",
        error: "Bot is not configured or disabled",
      };
    }
    if (this.starting) await this.starting;
    if (!this.bot) {
      return {
        name: "",
        username: "",
        error: this.startError ?? "Bot not started",
      };
    }
    try {
      const me = await this.bot.api.getMe();
      const avatar = await this.loadAvatar(me.id);
      return {
        id: me.id,
        name: me.first_name,
        username: me.username || "",
        hasAvatar: !!avatar,
      };
    } catch (error) {
      this.logger.error(`Failed to get bot info: ${getErrorMessage(error)}`);
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

  /** Bot profile photo, null when the bot has none */
  async getBotAvatar(): Promise<{ data: Buffer; mime: string } | null> {
    if (this.starting) await this.starting;
    if (!this.bot) return null;
    const me = await this.bot.api.getMe();
    return this.loadAvatar(me.id);
  }

  // Smallest photo size is enough for a 30px avatar, cached until the photo changes
  private async loadAvatar(
    botId: number,
  ): Promise<{ data: Buffer; mime: string } | null> {
    if (!this.bot) return null;
    try {
      const photos = await this.bot.api.getUserProfilePhotos(botId, {
        limit: 1,
      });
      const sizes = photos.photos[0];
      if (!sizes?.length) {
        this.avatar = null;
        return null;
      }
      const photo =
        sizes.find((p) => p.width >= 160) ?? sizes[sizes.length - 1];
      if (this.avatar?.fileUniqueId === photo.file_unique_id)
        return this.avatar;

      const file = await this.bot.api.getFile(photo.file_id);
      if (!file.file_path) return null;
      // The token is part of the URL, the file is proxied so it never reaches the browser
      const token = this.configService.get("telegramBot").token;
      const response = await fetch(
        `https://api.telegram.org/file/bot${token}/${file.file_path}`,
      );
      if (!response.ok) return null;
      this.avatar = {
        fileUniqueId: photo.file_unique_id,
        data: Buffer.from(await response.arrayBuffer()),
        mime: response.headers.get("content-type") || "image/jpeg",
      };
      return this.avatar;
    } catch (error) {
      this.logger.error(`Failed to load bot avatar: ${getErrorMessage(error)}`);
      return null;
    }
  }
}
