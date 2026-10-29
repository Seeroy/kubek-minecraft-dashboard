import { Startup } from "@/core/utils/startup";
import { checkForUpdates } from "@/core/utils/updates";
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

/**
 * Periodically re-checks GitHub for new releases
 */
@Injectable()
export class UpdateCheckService {
  private readonly logger = new Logger(UpdateCheckService.name);

  @Cron(CronExpression.EVERY_12_HOURS)
  async checkForUpdates(): Promise<void> {
    const previousVersion = Startup.latestUpdate?.latestVersion;
    const result = await checkForUpdates();

    Startup.latestUpdate = result;

    // UI asks over HTTP, here we just log a new version
    if (
      result.updateAvailable &&
      result.latestVersion !== previousVersion &&
      process.env.NODE_ENV !== "production"
    ) {
      this.logger.log(`Update available: v${result.latestVersion}`);
    }
  }
}
