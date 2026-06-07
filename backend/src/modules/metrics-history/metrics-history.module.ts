import { DatabaseModule } from "@/modules/database/database.module";
import { InstancesModule } from "@/modules/instances/instances.module";
import { SystemMonitoringModule } from "@/modules/system-monitoring/system-monitoring.module";
import { Module } from "@nestjs/common";
import { MetricsHistoryController } from "./metrics-history.controller";
import { MetricsCollectorService } from "./services/metrics-collector.service";
import { MetricsQueryService } from "./services/metrics-query.service";
import { MetricsRetentionService } from "./services/metrics-retention.service";
import { ProcessStatsService } from "./services/process-stats.service";

@Module({
  imports: [DatabaseModule, SystemMonitoringModule, InstancesModule],
  controllers: [MetricsHistoryController],
  providers: [
    ProcessStatsService,
    MetricsCollectorService,
    MetricsRetentionService,
    MetricsQueryService,
  ],
  exports: [MetricsQueryService],
})
export class MetricsHistoryModule {}
