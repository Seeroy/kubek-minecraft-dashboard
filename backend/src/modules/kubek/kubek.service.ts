import { AppEventsService } from "@/core/events/app-events.service";
import { IConfiguration } from "@/core/types/config";
import { ConfigService } from "@/modules/config/config.service";
import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import type { PanelActor } from "@/modules/telegram-bot/bot-linking.service";
import { TelegramBotService } from "@/modules/telegram-bot/telegram-bot.service";
import { Injectable, NotFoundException } from "@nestjs/common";
import {
  AuditAction,
  AuditCategory,
  AuditResult,
} from "@shared/types/audit.types";
import { checkForUpdates, getVersion } from "../../core/utils/updates";
import {
  type ConfigView,
  isSecretPath,
  mergeSecrets,
  readSecret,
  toConfigView,
} from "./config-view";

@Injectable()
export class KubekService {
  constructor(
    private readonly configService: ConfigService,
    private readonly telegramBotService: TelegramBotService,
    private readonly audit: AuditLogService,
    private readonly events: AppEventsService,
  ) {}

  /**
   * Get Kubek version.
   * @returns Version string
   */
  getVersion(): string {
    return getVersion();
  }

  /** Configuration as exposed by the API, without secret values */
  getConfigView(): ConfigView {
    return toConfigView(this.configService.getAll());
  }

  /** Detached copy of the stored config, secrets included */
  snapshot(): IConfiguration {
    return structuredClone(this.configService.getAll());
  }

  revealSecret(path: string): { value: string | null } {
    if (!isSecretPath(path)) throw new NotFoundException("Unknown secret");
    return { value: readSecret(this.configService.getAll(), path) };
  }

  /**
   * Set configuration.
   * @param config - Configuration data
   */
  setConfig(config: Partial<IConfiguration>, actor?: PanelActor): ConfigView {
    const oldConfig = this.configService.getAll();
    const newConfig = this.configService.setAll(
      mergeSecrets(oldConfig, config),
    );
    this.events.emit("config.changed", { before: oldConfig, after: newConfig });

    // Check if telegram bot config changed
    const oldTelegram = oldConfig.telegramBot;
    const newTelegram = newConfig.telegramBot;

    if (
      oldTelegram?.enabled !== newTelegram?.enabled ||
      oldTelegram?.token !== newTelegram?.token
    ) {
      // Started right away so a following info request waits for it
      void this.telegramBotService
        .restartBot()
        .then(() => this.telegramBotService.getBotInfo())
        .then((info) => {
          if (!actor) return;
          // Logged after the restart so the entry says whether the bot came up
          this.audit.record({
            action: AuditAction.TELEGRAM_BOT_CONFIGURE,
            category: AuditCategory.TELEGRAM,
            resourceType: "telegram_bot",
            resourceId: info.id ? String(info.id) : null,
            resourceName: info.username ? `@${info.username}` : null,
            userId: actor.userId,
            username: actor.username,
            details: {
              enabledBefore: !!oldTelegram?.enabled,
              enabled: !!newTelegram?.enabled,
              tokenChanged: oldTelegram?.token !== newTelegram?.token,
              botName: info.name || null,
            },
            result:
              info.error && newTelegram?.enabled
                ? AuditResult.FAILED
                : AuditResult.SUCCESS,
            error: newTelegram?.enabled ? (info.error ?? null) : null,
            ip: actor.ip,
            userAgent: actor.userAgent,
          });
        });
    }

    return toConfigView(newConfig);
  }

  /**
   * Accept EULA agreement
   */
  acceptEULA() {
    return this.configService.set("eulaAccepted", true);
  }

  /**
   * Check for updates on GitHub.
   * @returns Update information
   */
  async checkForUpdates(): Promise<{
    updateAvailable: boolean;
    latestVersion: string;
    releaseNotes?: string;
  }> {
    return await checkForUpdates();
  }
}
