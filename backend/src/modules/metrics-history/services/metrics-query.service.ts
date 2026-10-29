import {
  MetricsRepository,
  MetricsResolution,
} from "@/modules/database/repositories/metrics.repository";
import { Injectable } from "@nestjs/common";

export type MetricsWindow = "1h" | "6h" | "12h" | "24h";

export interface MetricPointDto {
  ts: number;
  cpu: number;
  ramUsed: number;
  ramTotal: number;
}

const HOUR = 60 * 60 * 1000;

@Injectable()
export class MetricsQueryService {
  constructor(private readonly metrics: MetricsRepository) {}

  range(scope: string, window: MetricsWindow): MetricPointDto[] {
    const now = Date.now();
    let from: number;
    let resolution: MetricsResolution;

    switch (window) {
      case "1h":
        from = now - 1 * HOUR;
        resolution = MetricsResolution.RAW;
        break;
      case "6h":
        from = now - 6 * HOUR;
        resolution = MetricsResolution.ONE_MINUTE;
        break;
      case "12h":
        from = now - 12 * HOUR;
        resolution = MetricsResolution.FIVE_MINUTES;
        break;
      case "24h":
        from = now - 24 * HOUR;
        resolution = MetricsResolution.FIVE_MINUTES;
        break;
    }

    return this.metrics.range(resolution, scope, from, now).map((p) => ({
      ts: p.ts,
      cpu: p.cpuAvg,
      ramUsed: p.ramAvg,
      ramTotal: p.ramTotal,
    }));
  }
}
