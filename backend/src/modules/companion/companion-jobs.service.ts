import { CompanionEventsRepository } from "@/modules/database/repositories/companion-events.repository";
import { CompanionMetricsRepository } from "@/modules/database/repositories/companion-metrics.repository";
import { MetricsResolution } from "@/modules/database/repositories/metrics.repository";
import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;
const FEED_MAX_AGE = 30 * DAY;
const FEED_MAX_ROWS = 5000;

/** Rolls companion metrics up and keeps the tables small */
@Injectable()
export class CompanionJobsService {
  // Closed buckets only, the first run picks up whatever raw rows are there
  private lastMinute = 0;
  private lastFiveMinutes = 0;

  constructor(
    private readonly metrics: CompanionMetricsRepository,
    private readonly feed: CompanionEventsRepository,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  rollUpMinute(): void {
    const to = Math.floor(Date.now() / 60_000) * 60_000;
    if (to <= this.lastMinute) return;
    this.metrics.rollUp(
      MetricsResolution.RAW,
      MetricsResolution.ONE_MINUTE,
      this.lastMinute,
      to,
    );
    this.lastMinute = to;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  rollUpFiveMinutes(): void {
    const to = Math.floor(Date.now() / 300_000) * 300_000;
    if (to <= this.lastFiveMinutes) return;
    this.metrics.rollUp(
      MetricsResolution.ONE_MINUTE,
      MetricsResolution.FIVE_MINUTES,
      this.lastFiveMinutes,
      to,
    );
    this.lastFiveMinutes = to;
  }

  // TPS history is worth a week, raw and minute rows only feed the rollups
  @Cron(CronExpression.EVERY_10_MINUTES)
  prune(): void {
    const now = Date.now();
    this.metrics.deleteOlderThan(MetricsResolution.RAW, now - 2 * HOUR);
    this.metrics.deleteOlderThan(MetricsResolution.ONE_MINUTE, now - 12 * HOUR);
    this.metrics.deleteOlderThan(MetricsResolution.FIVE_MINUTES, now - 8 * DAY);
  }

  @Cron(CronExpression.EVERY_HOUR)
  pruneFeed(): void {
    this.feed.prune(Date.now() - FEED_MAX_AGE, FEED_MAX_ROWS);
  }
}
