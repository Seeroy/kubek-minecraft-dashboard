import {
  MetricsRepository,
  MetricsResolution,
} from "@/modules/database/repositories/metrics.repository";
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

const HOUR = 60 * 60 * 1000;

@Injectable()
export class MetricsRetentionService {
  private readonly logger = new Logger(MetricsRetentionService.name);

  constructor(private readonly metrics: MetricsRepository) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  prune(): void {
    const now = Date.now();
    const rawDel = this.metrics.deleteOlderThan(
      MetricsResolution.RAW,
      now - 1 * HOUR,
    );
    const m1Del = this.metrics.deleteOlderThan(
      MetricsResolution.ONE_MINUTE,
      now - 6 * HOUR,
    );
    const m5Del = this.metrics.deleteOlderThan(
      MetricsResolution.FIVE_MINUTES,
      now - 24 * HOUR,
    );
    if ((rawDel || m1Del || m5Del) && process.env.NODE_ENV !== "production") {
      this.logger.debug(
        `pruned metrics: raw=${rawDel} 1m=${m1Del} 5m=${m5Del}`,
      );
    }
  }
}
