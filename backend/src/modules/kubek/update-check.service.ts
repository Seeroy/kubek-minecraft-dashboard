import { AppEventsService } from "@/core/events/app-events.service";
import { Startup } from "@/core/utils/startup";
import { checkForUpdates, getVersion, type UpdateCheckResult } from "@/core/utils/updates";
import { ConfigService } from "@/modules/config/config.service";
import { Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

// Gives the startup check time to finish so GitHub is asked once
const FIRST_CHECK_DELAY_MS = 60_000;
const NOTIFIED_KEY = "updateNotifiedVersion";
const RELEASES_URL = "https://github.com/Seeroy/kubek-minecraft-dashboard/releases";

/**
 * Periodically re-checks GitHub for new releases
 */
@Injectable()
export class UpdateCheckService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UpdateCheckService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly events: AppEventsService,
  ) {}

  onApplicationBootstrap(): void {
    setTimeout(() => {
      void (Startup.latestUpdate ? Promise.resolve(Startup.latestUpdate) : checkForUpdates()).then((result) =>
        this.notifyOnce(result),
      );
    }, FIRST_CHECK_DELAY_MS).unref();
  }

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
    this.notifyOnce(result);
  }

  /** One notification per release, survives restarts */
  notifyOnce(result: Pick<UpdateCheckResult, "updateAvailable" | "latestVersion"> & { releaseUrl?: string }): void {
    // Dev builds always look outdated
    if (!result.updateAvailable || process.env.NODE_ENV === "development") return;
    if (this.config.get(NOTIFIED_KEY) === result.latestVersion) return;
    this.config.set(NOTIFIED_KEY, result.latestVersion);
    this.events.emit("panel.update_available", {
      version: result.latestVersion,
      currentVersion: getVersion(),
      url: result.releaseUrl || RELEASES_URL,
    });
  }
}
