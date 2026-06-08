import {
  Metrics1mRepository,
  Metrics5mRepository,
  MetricsRawRepository,
} from "@/modules/database/repositories/metrics.repository";
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

const HOUR = 60 * 60 * 1000;

@Injectable()
export class MetricsRetentionService {
  private readonly logger = new Logger(MetricsRetentionService.name);

  constructor(
    private readonly raw: MetricsRawRepository,
    private readonly m1m: Metrics1mRepository,
    private readonly m5m: Metrics5mRepository,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  prune(): void {
    const now = Date.now();
    const rawDel = this.raw.deleteOlderThan(now - 1 * HOUR);
    const m1Del = this.m1m.deleteOlderThan(now - 6 * HOUR);
    const m5Del = this.m5m.deleteOlderThan(now - 24 * HOUR);
    if (
      (rawDel || m1Del || m5Del) &&
      process.env.NODE_ENV !== "production"
    ) {
      this.logger.debug(
        `pruned metrics: raw=${rawDel} 1m=${m1Del} 5m=${m5Del}`,
      );
    }
  }
}
