import { Startup } from "@/core/utils/startup";
import { checkForUpdates } from "@/core/utils/updates";
import { ServerBroadcastService } from "@/ws/services/server-broadcast.service";
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

/**
 * Periodically re-checks GitHub for new releases
 */
@Injectable()
export class UpdateCheckService {
  private readonly logger = new Logger(UpdateCheckService.name);

  constructor(private readonly broadcast: ServerBroadcastService) {}

  @Cron(CronExpression.EVERY_12_HOURS)
  async checkForUpdates(): Promise<void> {
    const previousVersion = Startup.latestUpdate?.latestVersion;
    const result = await checkForUpdates();

    Startup.latestUpdate = result;

    // Only notify when a genuinely newer version appeared since the last check
    if (result.updateAvailable && result.latestVersion !== previousVersion) {
      if (process.env.NODE_ENV !== "production") {
        this.logger.log(`Update available: v${result.latestVersion}`);
      }
      this.broadcast.emitUpdateNotification({
        latestVersion: result.latestVersion,
        releaseNotes: result.releaseNotes,
      });
    }
  }
}
