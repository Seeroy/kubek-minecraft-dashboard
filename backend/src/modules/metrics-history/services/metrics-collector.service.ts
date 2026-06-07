import {
  Metrics1mRepository,
  Metrics5mRepository,
  MetricsRawRepository,
  RawMetricPoint,
} from "@/modules/database/repositories/metrics.repository";
import { SystemMonitoringService } from "@/modules/system-monitoring/system-monitoring.service";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ProcessStatsService } from "./process-stats.service";

export const SYSTEM_SCOPE = "system";
export const serverScope = (serverId: string) => `server:${serverId}`;

@Injectable()
export class MetricsCollectorService implements OnModuleInit {
  private readonly logger = new Logger(MetricsCollectorService.name);
  private lastAggregated1m = 0;
  private lastAggregated5m = 0;

  constructor(
    private readonly system: SystemMonitoringService,
    private readonly procStats: ProcessStatsService,
    private readonly raw: MetricsRawRepository,
    private readonly m1m: Metrics1mRepository,
    private readonly m5m: Metrics5mRepository,
  ) {}

  onModuleInit() {
    this.lastAggregated1m = Math.floor(Date.now() / 60_000) * 60_000;
    this.lastAggregated5m = Math.floor(Date.now() / 300_000) * 300_000;
  }

  // Raw sample every 10s
  @Cron(CronExpression.EVERY_10_SECONDS)
  async collect(): Promise<void> {
    const ts = Date.now();
    const points: RawMetricPoint[] = [];

    try {
      const res = await this.system.getResourcesUsage();
      points.push({
        ts,
        scope: SYSTEM_SCOPE,
        cpu: res.cpu,
        ramUsed: res.memory.total - res.memory.free,
        ramTotal: res.memory.total,
      });
    } catch (e) {
      this.logger.warn(
        `system metrics collection failed: ${(e as Error).message}`,
      );
    }

    // Per-server process stats via pidusage temporarily disabled
    // TODO: PowerShell fix
    void this.procStats;
    void serverScope;

    if (points.length > 0) this.raw.insertMany(points);
  }

  // Roll up raw into 1m buckets every minute (operate only on closed buckets)
  @Cron(CronExpression.EVERY_MINUTE)
  rollUp1m(): void {
    const now = Date.now();
    const currentBucket = Math.floor(now / 60_000) * 60_000;
    const fromTs = this.lastAggregated1m;
    const toTs = currentBucket; // exclusive
    if (toTs <= fromTs) return;

    const buckets = this.raw.aggregateBuckets(60_000, fromTs, toTs);
    this.m1m.upsertMany(buckets);
    this.lastAggregated1m = toTs;
  }

  // Roll up 1m into 5m buckets every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  rollUp5m(): void {
    const now = Date.now();
    const currentBucket = Math.floor(now / 300_000) * 300_000;
    const fromTs = this.lastAggregated5m;
    const toTs = currentBucket;
    if (toTs <= fromTs) return;

    const buckets = this.m5m.aggregateFrom("metrics_1m", 300_000, fromTs, toTs);
    this.m5m.upsertMany(buckets);
    this.lastAggregated5m = toTs;
  }
}
