import {
  Metrics1mRepository,
  Metrics5mRepository,
  MetricsRawRepository,
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
  constructor(
    private readonly raw: MetricsRawRepository,
    private readonly m1m: Metrics1mRepository,
    private readonly m5m: Metrics5mRepository,
  ) {}

  range(scope: string, window: MetricsWindow): MetricPointDto[] {
    const now = Date.now();
    let from: number;
    let source: "raw" | "1m" | "5m";

    switch (window) {
      case "1h":
        from = now - 1 * HOUR;
        source = "raw";
        break;
      case "6h":
        from = now - 6 * HOUR;
        source = "1m";
        break;
      case "12h":
        from = now - 12 * HOUR;
        source = "5m";
        break;
      case "24h":
        from = now - 24 * HOUR;
        source = "5m";
        break;
    }

    if (source === "raw") {
      return this.raw.range(scope, from, now).map((p) => ({
        ts: p.ts,
        cpu: p.cpu,
        ramUsed: p.ramUsed,
        ramTotal: p.ramTotal,
      }));
    }
    const repo = source === "1m" ? this.m1m : this.m5m;
    return repo.range(scope, from, now).map((p) => ({
      ts: p.ts,
      cpu: p.cpuAvg,
      ramUsed: p.ramAvg,
      ramTotal: p.ramTotal,
    }));
  }
}
