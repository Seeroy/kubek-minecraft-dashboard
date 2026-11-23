import { getErrorMessage } from "@/core/utils/error";
import { TelegramUsersRepository } from "@/modules/database/repositories/telegram-users.repository";
import { Injectable, Logger } from "@nestjs/common";
import type {
  ITelegramUser,
  TelegramLang,
} from "@/modules/telegram-bot/telegram.types";
import type {
  NotificationKind,
  NotificationParamsMap,
} from "@shared/types/notification.types";
import { ServerStatus } from "@shared/types/server/server.types";
import { Bot, InlineKeyboard } from "grammy";
import {
  escapeHtml,
  renderTaskNotification,
  statusLabel,
  tgTime,
} from "./bot-format";
import {
  backupRetryKeyboard,
  crashKeyboard,
  loginAlertKeyboard,
} from "./bot-keyboards";
import { isUnreachable, sendRich, type RichView } from "./bot-reply";
import { detectLang, t } from "./i18n";

type Renderer<K extends NotificationKind> = (
  lang: TelegramLang,
  params: NotificationParamsMap[K],
) => RichView | string;

type TaskKind = "task.succeeded" | "task.failed" | "task.cancelled";

const taskRenderer =
  (status: "success" | "failed" | "cancelled"): Renderer<TaskKind> =>
  (lang, p) =>
    renderTaskNotification(lang, {
      status,
      type: p.title ?? p.taskType,
      duration: formatDuration(p.durationMs, lang),
      finishedAt: Date.now(),
      serverName: p.serverName,
      pluginName: p.pluginName,
      errorMessage: p.error,
    });

const serverStatus = (lang: TelegramLang, name: string, status: string) =>
  t(lang, "notify.serverStatus", {
    name: escapeHtml(name),
    status: statusLabel(lang, status),
  });

// Kinds without a renderer stay out of Telegram, a string is sent as a plain HTML message
const RENDERERS: { [K in NotificationKind]?: Renderer<K> } = {
  "task.succeeded": taskRenderer("success"),
  "task.failed": taskRenderer("failed"),
  "task.cancelled": taskRenderer("cancelled"),
  "server.status": (lang, p) => serverStatus(lang, p.serverName, p.status),
  "server.crashed": (lang, p) =>
    serverStatus(lang, p.serverName, ServerStatus.CRASHED),
  "server.error": (lang, p) =>
    t(lang, "notify.serverError", {
      name: escapeHtml(p.serverName),
      error: escapeHtml(p.errorType),
    }),
  "server.low_tps": (lang, p) =>
    t(lang, "notify.lowTps", {
      name: escapeHtml(p.serverName),
      tps: p.tps.toFixed(1),
    }),
  "auth.login": (lang, p) =>
    t(lang, "notify.login", {
      username: escapeHtml(p.username),
      ip: escapeHtml(p.ip ?? "?"),
    }),
  "backup.failed": (lang, p) =>
    t(lang, "notify.backupFailed", {
      name: escapeHtml(p.serverName),
      backup: escapeHtml(p.backupName),
      op: t(lang, `notify.backupOps.${p.op}`),
      error: escapeHtml(p.error ?? "?"),
    }),
  "storage.unreachable": (lang, p) =>
    t(lang, "notify.storageUnreachable", {
      name: escapeHtml(p.storageName),
      error: escapeHtml(p.error),
    }),
  "auth.locked": (lang, p) =>
    t(lang, "notify.locked", {
      ip: escapeHtml(p.ip ?? "?"),
      minutes: Math.ceil(p.retryAfterSec / 60),
    }),
  "panel.update_available": (lang, p) =>
    t(lang, "notify.updateAvailable", {
      version: escapeHtml(p.version),
      current: escapeHtml(p.currentVersion),
    }),
  "content.updates_available": (lang, p) => {
    const rest = p.count - p.names.length;
    const names = p.names.map(escapeHtml).join(", ");
    return t(lang, `notify.contentUpdates.${p.kind}`, {
      name: escapeHtml(p.serverName),
      count: p.count,
      list: rest > 0 ? t(lang, "notify.contentUpdates.more", { names, rest }) : names,
    });
  },
};

// Actions offered right under an alert, each callback checks access again
const KEYBOARDS: {
  [K in NotificationKind]?: (
    lang: TelegramLang,
    params: NotificationParamsMap[K],
  ) => InlineKeyboard | undefined;
} = {
  "server.crashed": (lang, p) => crashKeyboard(lang, p.serverId),
  "auth.login": (lang, p) => loginAlertKeyboard(lang, p.userId),
  // Restore and upload retries need more context than an alert has, create is safe to repeat
  "backup.failed": (lang, p) =>
    p.op === "create" && p.backupId
      ? backupRetryKeyboard(lang, p.backupId)
      : undefined,
  "panel.update_available": (lang, p) =>
    new InlineKeyboard().url(t(lang, "buttons.openRelease"), p.url),
};

/** Delivers notifications to the Telegram chat linked to a panel user */
@Injectable()
export class TelegramNotifier {
  private readonly logger = new Logger(TelegramNotifier.name);
  private bot: Bot | null = null;

  constructor(private readonly telegramUsersRepo: TelegramUsersRepository) {}

  setBot(bot: Bot | null) {
    this.bot = bot;
  }

  async send<K extends NotificationKind>(
    userId: string,
    kind: K,
    params: NotificationParamsMap[K],
  ): Promise<void> {
    const render = RENDERERS[kind];
    const tgUser = render && this.linkedUser(userId);
    if (!render || !tgUser) return;
    const lang = detectLang(tgUser.language);
    const view = render(lang, params);
    const keyboard = KEYBOARDS[kind]?.(lang, params);
    await this.deliver(tgUser, (api) =>
      typeof view === "string"
        ? api.sendMessage(tgUser.id, withTime(view), {
            parse_mode: "HTML",
            reply_markup: keyboard,
          })
        : sendRich(api, tgUser.id, view, keyboard),
    );
  }

  private linkedUser(userId: string): ITelegramUser | null {
    if (!this.bot) return null;
    const tgUser = this.telegramUsersRepo.findByUserId(userId);
    return tgUser?.isActive ? tgUser : null;
  }

  // Never throws, unlinks users who blocked the bot
  private async deliver(
    tgUser: ITelegramUser,
    send: (api: Bot["api"]) => Promise<unknown>,
  ): Promise<void> {
    if (!this.bot) return;
    try {
      await send(this.bot.api);
    } catch (error) {
      if (isUnreachable(error)) {
        this.telegramUsersRepo.deactivate(tgUser.id);
        return;
      }
      this.logger.error(
        `Failed to notify Telegram user ${tgUser.id}: ${getErrorMessage(error)}`,
      );
    }
  }
}

// Read later the alert still says when it happened, Telegram keeps "5 min ago" current
function withTime(text: string): string {
  return `${text}\n<i>${tgTime(Date.now(), "r")}</i>`;
}

function formatDuration(ms: number, lang: TelegramLang): string {
  const unit = (key: string) => t(lang, `taskNotify.units.${key}`);
  if (ms < 1000) return `${ms} ${unit("ms")}`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds} ${unit("sec")}`;
  const minutes = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  if (minutes < 60) return `${minutes} ${unit("min")} ${remSec} ${unit("sec")}`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ${unit("hour")} ${minutes % 60} ${unit("min")}`;
}
