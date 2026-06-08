import { TelegramUsersRepository } from "@/modules/database/repositories/telegram-users.repository";
import { Injectable } from "@nestjs/common";
import type { ITelegramUser, TelegramLang } from "@/modules/telegram-bot/telegram.types";
import { Bot } from "grammy";
import { detectLang, t } from "./i18n";

export interface TaskNotificationInfo {
  status: "success" | "failed" | "cancelled";
  type: string;
  durationMs: number;
  serverName?: string;
  pluginName?: string;
  errorMessage?: string;
}

/**
 * Service for handling event-driven notifications to Telegram users
 */
@Injectable()
export class NotificationService {
  private bot: Bot | null = null;

  constructor(private readonly telegramUsersRepo: TelegramUsersRepository) {}

  /**
   * Set the Bot instance to use for notifications
   */
  setBot(bot: Bot | null) {
    this.bot = bot;
  }

  /**
   * Send notification to all linked Telegram users
   */
  async sendGlobalNotification(message: string): Promise<void> {
    if (!this.bot) return;

    const linkedUsers = this.telegramUsersRepo
      .findAll()
      .filter((u) => u.isActive);

    for (const user of linkedUsers) {
      try {
        await this.bot.api.sendMessage(user.id, message);
        // Rate limiting: small delay between messages
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(
          `Failed to send notification to Telegram user ${user.id}:`,
          error,
        );
      }
    }
  }

  /**
   * Send notification to specific user
   */
  async sendUserNotification(userId: string, message: string): Promise<void> {
    if (!this.bot) return;

    const telegramUser = this.telegramUsersRepo.findByUserId(userId);
    if (!telegramUser?.isActive) return;

    try {
      await this.bot.api.sendMessage(telegramUser.id, message);
    } catch (error) {
      console.error(`Failed to send notification to user ${userId}:`, error);
    }
  }

  // Send a task-result notification in the recipient's bot language
  async sendTaskNotification(
    userId: string,
    info: TaskNotificationInfo,
  ): Promise<void> {
    if (!this.bot) return;

    const telegramUser = this.telegramUsersRepo.findByUserId(userId);
    if (!telegramUser?.isActive) return;

    const lang = detectLang(telegramUser.language);
    const emoji =
      info.status === "success" ? "✅" : info.status === "failed" ? "❌" : "⏹️";
    const statusKey =
      info.status === "success"
        ? "done"
        : info.status === "failed"
          ? "failed"
          : "cancelled";

    const lines = [
      t(lang, "taskNotify.title", {
        emoji,
        type: info.type,
        status: t(lang, `taskNotify.${statusKey}`),
      }),
      t(lang, "taskNotify.duration", {
        value: this.formatDuration(info.durationMs, lang),
      }),
    ];
    if (info.serverName)
      lines.push(t(lang, "taskNotify.server", { name: info.serverName }));
    if (info.pluginName)
      lines.push(t(lang, "taskNotify.plugin", { name: info.pluginName }));
    if (info.errorMessage)
      lines.push(t(lang, "taskNotify.error", { message: info.errorMessage }));

    try {
      await this.bot.api.sendMessage(telegramUser.id, lines.join("\n"));
    } catch (error) {
      console.error(
        `Failed to send task notification to user ${userId}:`,
        error,
      );
    }
  }

  private formatDuration(ms: number, lang: TelegramLang): string {
    const unit = (key: string) => t(lang, `taskNotify.units.${key}`);
    if (ms < 1000) return `${ms} ${unit("ms")}`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds} ${unit("sec")}`;
    const minutes = Math.floor(seconds / 60);
    const remSec = seconds % 60;
    if (minutes < 60)
      return `${minutes} ${unit("min")} ${remSec} ${unit("sec")}`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ${unit("hour")} ${minutes % 60} ${unit("min")}`;
  }

  /**
   * Send server status notification
   */
  async sendServerStatusNotification(
    serverId: string,
    serverName: string,
    status: string,
  ): Promise<void> {
    const message = `🖥️ Server "${serverName}" status changed to: ${status}`;
    await this.sendGlobalNotification(message);
  }

  /**
   * Send server error notification
   */
  async sendServerErrorNotification(
    serverId: string,
    serverName: string,
    error: string,
  ): Promise<void> {
    const message = `🚨 Server "${serverName}" error: ${error}`;
    await this.sendGlobalNotification(message);
  }

  /**
   * Send system resource alert
   */
  async sendSystemAlert(message: string): Promise<void> {
    const alertMessage = `⚠️ System Alert: ${message}`;
    await this.sendGlobalNotification(alertMessage);
  }

  /**
   * Send backup completion notification
   */
  async sendBackupNotification(
    serverName: string,
    success: boolean,
  ): Promise<void> {
    const status = success ? "✅ completed successfully" : "❌ failed";
    const message = `💾 Backup for server "${serverName}" ${status}`;
    await this.sendGlobalNotification(message);
  }

  /**
   * Send plugin installation notification
   */
  async sendPluginNotification(
    serverName: string,
    pluginName: string,
    action: "installed" | "removed" | "updated",
  ): Promise<void> {
    const icons = { installed: "📦", removed: "🗑️", updated: "🔄" };
    const message = `${icons[action]} Plugin "${pluginName}" ${action} on server "${serverName}"`;
    await this.sendGlobalNotification(message);
  }

  /**
   * Get all active Telegram users
   */
  getActiveTelegramUsers(): ITelegramUser[] {
    return this.telegramUsersRepo.findAll().filter((u) => u.isActive);
  }

  /**
   * Check if bot is configured and ready
   */
  isBotReady(): boolean {
    return this.bot !== null;
  }
}
