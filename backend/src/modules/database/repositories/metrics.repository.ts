import { Injectable } from "@nestjs/common";
import { SqliteProvider } from "../sqlite.provider";

// Bucket size in ms. Raw samples have avg equal to max
export enum MetricsResolution {
  RAW = 0,
  ONE_MINUTE = 60_000,
  FIVE_MINUTES = 300_000,
}

export interface RawMetricPoint {
  ts: number;
  scope: string;
  cpu: number;
  ramUsed: number;
  ramTotal: number;
}

export interface AggregatedMetricPoint {
  ts: number;
  scope: string;
  cpuAvg: number;
  cpuMax: number;
  ramAvg: number;
  ramMax: number;
  ramTotal: number;
}

const SYSTEM_SCOPE = "system";
const SERVER_SCOPE_PREFIX = "server:";

// "system" is the host (NULL), "server:<id>" is a server
function scopeToServerId(scope: string): string | null {
  return scope.startsWith(SERVER_SCOPE_PREFIX)
    ? scope.slice(SERVER_SCOPE_PREFIX.length)
    : null;
}

function serverIdToScope(serverId: string | null): string {
  return serverId == null ? SYSTEM_SCOPE : `${SERVER_SCOPE_PREFIX}${serverId}`;
}

@Injectable()
export class MetricsRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  insertRaw(points: RawMetricPoint[]): void {
    if (points.length === 0) return;
    const stmt = this.sqlite.connection.prepare(
      `INSERT OR REPLACE INTO metrics
       (resolution, serverId, ts, cpuAvg, cpuMax, ramAvg, ramMax, ramTotal)
       SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8
        WHERE ?2 IS NULL OR EXISTS (SELECT 1 FROM servers WHERE id = ?2)`,
    );
    const tx = this.sqlite.connection.transaction((rows: RawMetricPoint[]) => {
      for (const r of rows) {
        stmt.run(
          MetricsResolution.RAW,
          scopeToServerId(r.scope),
          r.ts,
          r.cpu,
          r.cpu,
          r.ramUsed,
          r.ramUsed,
          r.ramTotal,
        );
      }
    });
    tx(points);
  }

  range(
    resolution: MetricsResolution,
    scope: string,
    fromTs: number,
    toTs: number,
  ): AggregatedMetricPoint[] {
    const rows = this.sqlite.connection
      .query(
        `SELECT * FROM metrics
          WHERE resolution = ? AND IFNULL(serverId, '') = ? AND ts >= ? AND ts <= ?
          ORDER BY ts ASC`,
      )
      .all(resolution, scopeToServerId(scope) ?? "", fromTs, toTs) as any[];
    return rows.map((r) => ({
      ts: Number(r.ts),
      scope: serverIdToScope(r.serverId ?? null),
      cpuAvg: Number(r.cpuAvg),
      cpuMax: Number(r.cpuMax),
      ramAvg: Number(r.ramAvg),
      ramMax: Number(r.ramMax),
      ramTotal: Number(r.ramTotal),
    }));
  }

  // Averages finished buckets into the next resolution
  rollUp(
    from: MetricsResolution,
    to: MetricsResolution,
    fromTs: number,
    toTs: number,
  ): void {
    this.sqlite.connection
      .prepare(
        `INSERT OR REPLACE INTO metrics
         (resolution, serverId, ts, cpuAvg, cpuMax, ramAvg, ramMax, ramTotal)
         SELECT ?1, serverId, (ts / ?1) * ?1 AS bucketTs,
                AVG(cpuAvg), MAX(cpuMax),
                CAST(ROUND(AVG(ramAvg)) AS INTEGER), MAX(ramMax), MAX(ramTotal)
           FROM metrics
          WHERE resolution = ?2 AND ts >= ?3 AND ts < ?4
          GROUP BY bucketTs, serverId`,
      )
      .run(to, from, fromTs, toTs);
  }

  deleteOlderThan(resolution: MetricsResolution, ts: number): number {
    const res = this.sqlite.connection
      .prepare(`DELETE FROM metrics WHERE resolution = ? AND ts < ?`)
      .run(resolution, ts);
    return res.changes ?? 0;
  }
}
