import { Injectable } from "@nestjs/common";
import { SqliteProvider } from "../sqlite.provider";
import { MetricsResolution } from "./metrics.repository";

/** One stats message from the plugin */
export interface CompanionSample {
  serverId: string;
  ts: number;
  tps: number | null;
  mspt: number | null;
  heapUsed: number;
  heapMax: number;
  players: number;
}

export interface CompanionMetricRow {
  ts: number;
  tpsAvg: number | null;
  tpsMin: number | null;
  msptAvg: number | null;
  msptMax: number | null;
  heapAvg: number;
  heapMax: number;
  heapLimit: number;
  playersAvg: number;
  playersMax: number;
}

const num = (v: unknown): number | null => (v == null ? null : Number(v));

/** TPS, MSPT, heap and online from the plugin, rolled up like host metrics */
@Injectable()
export class CompanionMetricsRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  insert(sample: CompanionSample): void {
    this.sqlite.connection
      .prepare(
        `INSERT OR REPLACE INTO companion_metrics
         (resolution, serverId, ts, tpsAvg, tpsMin, msptAvg, msptMax,
          heapAvg, heapMax, heapLimit, playersAvg, playersMax)
         SELECT ?1, ?2, ?3, ?4, ?4, ?5, ?5, ?6, ?6, ?7, ?8, ?8
          WHERE EXISTS (SELECT 1 FROM servers WHERE id = ?2)`,
      )
      .run(
        MetricsResolution.RAW,
        sample.serverId,
        sample.ts,
        sample.tps,
        sample.mspt,
        sample.heapUsed,
        sample.heapMax,
        sample.players,
      );
  }

  range(
    resolution: MetricsResolution,
    serverId: string,
    fromTs: number,
    toTs: number,
  ): CompanionMetricRow[] {
    const rows = this.sqlite.connection
      .query(
        `SELECT ts, tpsAvg, tpsMin, msptAvg, msptMax, heapAvg, heapMax,
                heapLimit, playersAvg, playersMax
           FROM companion_metrics
          WHERE resolution = ? AND serverId = ? AND ts >= ? AND ts <= ?
          ORDER BY ts ASC`,
      )
      .all(resolution, serverId, fromTs, toTs) as Record<string, unknown>[];
    return rows.map((r) => ({
      ts: Number(r.ts),
      tpsAvg: num(r.tpsAvg),
      tpsMin: num(r.tpsMin),
      msptAvg: num(r.msptAvg),
      msptMax: num(r.msptMax),
      heapAvg: Number(r.heapAvg),
      heapMax: Number(r.heapMax),
      heapLimit: Number(r.heapLimit),
      playersAvg: Number(r.playersAvg),
      playersMax: Number(r.playersMax),
    }));
  }

  /** Highest online count since a moment */
  peakPlayers(serverId: string, fromTs: number): number {
    const row = this.sqlite.connection
      .query(
        "SELECT MAX(playersMax) AS peak FROM companion_metrics WHERE serverId = ? AND ts >= ?",
      )
      .get(serverId, fromTs) as { peak: number | null } | null;
    return Number(row?.peak ?? 0);
  }

  // Finished buckets go into the next resolution, AVG and MIN skip nulls
  rollUp(
    from: MetricsResolution,
    to: MetricsResolution,
    fromTs: number,
    toTs: number,
  ): void {
    this.sqlite.connection
      .prepare(
        `INSERT OR REPLACE INTO companion_metrics
         (resolution, serverId, ts, tpsAvg, tpsMin, msptAvg, msptMax,
          heapAvg, heapMax, heapLimit, playersAvg, playersMax)
         SELECT ?1, serverId, (ts / ?1) * ?1 AS bucketTs,
                AVG(tpsAvg), MIN(tpsMin), AVG(msptAvg), MAX(msptMax),
                CAST(ROUND(AVG(heapAvg)) AS INTEGER), MAX(heapMax), MAX(heapLimit),
                AVG(playersAvg), MAX(playersMax)
           FROM companion_metrics
          WHERE resolution = ?2 AND ts >= ?3 AND ts < ?4
          GROUP BY bucketTs, serverId`,
      )
      .run(to, from, fromTs, toTs);
  }

  deleteOlderThan(resolution: MetricsResolution, ts: number): number {
    const res = this.sqlite.connection
      .prepare("DELETE FROM companion_metrics WHERE resolution = ? AND ts < ?")
      .run(resolution, ts);
    return res.changes ?? 0;
  }
}
