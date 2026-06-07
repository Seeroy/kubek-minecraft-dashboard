import { IConfiguration } from "@/core/types/config";
import { ConfigService } from "@/modules/config/config.service";
import { TelegramBotService } from "@/modules/telegram-bot/telegram-bot.service";
import { Injectable } from "@nestjs/common";
import { checkForUpdates, getVersion } from "../../core/utils/updates";

@Injectable()
export class KubekService {
  constructor(
    private readonly configService: ConfigService,
    private readonly telegramBotService: TelegramBotService,
  ) {}

  /**
   * Get Kubek version.
   * @returns Version string
   */
  getVersion(): string {
    return getVersion();
  }

  /**
   * Get all configuration.
   * @returns All configuration data
   */
  getAllConfig(): IConfiguration {
    return this.configService.getAll();
  }

  /**
   * Set configuration.
   * @param config - Configuration data
   */
  setConfig(config: Partial<IConfiguration>) {
    const oldConfig = this.configService.getAll();
    const newConfig = this.configService.setAll(config);

    // Check if telegram bot config changed
    const oldTelegram = oldConfig.telegramBot;
    const newTelegram = newConfig.telegramBot;

    if (
      oldTelegram?.enabled !== newTelegram?.enabled ||
      oldTelegram?.token !== newTelegram?.token
    ) {
      // Restart bot asynchronously
      setImmediate(() => {
        this.telegramBotService.restartBot();
      });
    }

    return newConfig;
  }

  /**
   * Get specific configuration value.
   * @param key - Configuration key
   * @returns Configuration value
   */
  getConfig(key: string): any {
    return this.configService.get(key);
  }

  /**
   * Set specific configuration value.
   * @param key - Configuration key
   * @param value - Configuration value
   */
  setConfigValue(key: string, value: any) {
    return this.configService.set(key, value);
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
