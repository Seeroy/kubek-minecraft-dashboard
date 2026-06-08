import { Injectable } from "@nestjs/common";
import { SqliteProvider } from "../sqlite.provider";

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

@Injectable()
export class MetricsRawRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  insertMany(points: Omit<RawMetricPoint, never>[]): void {
    if (points.length === 0) return;
    const stmt = this.sqlite.connection.prepare(
      `INSERT OR REPLACE INTO metrics_raw (ts, scope, cpu, ram_used, ram_total) VALUES (?, ?, ?, ?, ?)`,
    );
    const tx = this.sqlite.connection.transaction((rows: RawMetricPoint[]) => {
      for (const r of rows) {
        stmt.run(r.ts, r.scope, r.cpu, r.ramUsed, r.ramTotal);
      }
    });
    tx(points);
  }

  range(scope: string, fromTs: number, toTs: number): RawMetricPoint[] {
    const rows = this.sqlite.connection
      .query(
        "SELECT * FROM metrics_raw WHERE scope = ? AND ts >= ? AND ts <= ? ORDER BY ts ASC",
      )
      .all(scope, fromTs, toTs) as any[];
    return rows.map((r) => ({
      ts: Number(r.ts),
      scope: String(r.scope),
      cpu: Number(r.cpu),
      ramUsed: Number(r.ram_used),
      ramTotal: Number(r.ram_total),
    }));
  }

  // Aggregate closed buckets (avg/max) since last bucket end
  aggregateBuckets(
    bucketMs: number,
    fromTs: number,
    toTs: number,
  ): AggregatedMetricPoint[] {
    // Group by floor(ts / bucketMs) * bucketMs and scope
    const rows = this.sqlite.connection
      .query(
        `SELECT (ts / ?) * ? AS bucket_ts, scope,
                AVG(cpu) AS cpu_avg, MAX(cpu) AS cpu_max,
                AVG(ram_used) AS ram_avg, MAX(ram_used) AS ram_max,
                MAX(ram_total) AS ram_total
           FROM metrics_raw
          WHERE ts >= ? AND ts < ?
          GROUP BY bucket_ts, scope`,
      )
      .all(bucketMs, bucketMs, fromTs, toTs) as any[];
    return rows.map((r) => ({
      ts: Number(r.bucket_ts),
      scope: String(r.scope),
      cpuAvg: Number(r.cpu_avg),
      cpuMax: Number(r.cpu_max),
      ramAvg: Math.round(Number(r.ram_avg)),
      ramMax: Number(r.ram_max),
      ramTotal: Number(r.ram_total),
    }));
  }

  deleteOlderThan(ts: number): number {
    const res = this.sqlite.connection
      .prepare(`DELETE FROM metrics_raw WHERE ts < ?`)
      .run(ts);
    return res.changes ?? 0;
  }
}

abstract class BucketRepository {
  constructor(
    protected readonly sqlite: SqliteProvider,
    protected readonly table: "metrics_1m" | "metrics_5m",
  ) {}

  upsertMany(points: AggregatedMetricPoint[]): void {
    if (points.length === 0) return;
    const stmt = this.sqlite.connection.prepare(
      `INSERT OR REPLACE INTO ${this.table}
       (ts, scope, cpu_avg, cpu_max, ram_avg, ram_max, ram_total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    const tx = this.sqlite.connection.transaction(
      (rows: AggregatedMetricPoint[]) => {
        for (const r of rows) {
          stmt.run(
            r.ts,
            r.scope,
            r.cpuAvg,
            r.cpuMax,
            r.ramAvg,
            r.ramMax,
            r.ramTotal,
          );
        }
      },
    );
    tx(points);
  }

  range(scope: string, fromTs: number, toTs: number): AggregatedMetricPoint[] {
    const rows = this.sqlite.connection
      .query(
        `SELECT * FROM ${this.table} WHERE scope = ? AND ts >= ? AND ts <= ? ORDER BY ts ASC`,
      )
      .all(scope, fromTs, toTs) as any[];
    return rows.map((r) => ({
      ts: Number(r.ts),
      scope: String(r.scope),
      cpuAvg: Number(r.cpu_avg),
      cpuMax: Number(r.cpu_max),
      ramAvg: Number(r.ram_avg),
      ramMax: Number(r.ram_max),
      ramTotal: Number(r.ram_total),
    }));
  }

  // Aggregate from a finer-grained source bucket table
  aggregateFrom(
    sourceTable: "metrics_raw" | "metrics_1m",
    bucketMs: number,
    fromTs: number,
    toTs: number,
  ): AggregatedMetricPoint[] {
    const cpuExpr = sourceTable === "metrics_raw" ? "cpu" : "cpu_avg";
    const cpuMaxExpr = sourceTable === "metrics_raw" ? "cpu" : "cpu_max";
    const ramExpr = sourceTable === "metrics_raw" ? "ram_used" : "ram_avg";
    const ramMaxExpr = sourceTable === "metrics_raw" ? "ram_used" : "ram_max";

    const rows = this.sqlite.connection
      .query(
        `SELECT (ts / ?) * ? AS bucket_ts, scope,
                AVG(${cpuExpr}) AS cpu_avg, MAX(${cpuMaxExpr}) AS cpu_max,
                AVG(${ramExpr}) AS ram_avg, MAX(${ramMaxExpr}) AS ram_max,
                MAX(ram_total) AS ram_total
           FROM ${sourceTable}
          WHERE ts >= ? AND ts < ?
          GROUP BY bucket_ts, scope`,
      )
      .all(bucketMs, bucketMs, fromTs, toTs) as any[];
    return rows.map((r) => ({
      ts: Number(r.bucket_ts),
      scope: String(r.scope),
      cpuAvg: Number(r.cpu_avg),
      cpuMax: Number(r.cpu_max),
      ramAvg: Math.round(Number(r.ram_avg)),
      ramMax: Number(r.ram_max),
      ramTotal: Number(r.ram_total),
    }));
  }

  deleteOlderThan(ts: number): number {
    const res = this.sqlite.connection
      .prepare(`DELETE FROM ${this.table} WHERE ts < ?`)
      .run(ts);
    return res.changes ?? 0;
  }
}

@Injectable()
export class Metrics1mRepository extends BucketRepository {
  constructor(sqlite: SqliteProvider) {
    super(sqlite, "metrics_1m");
  }
}

@Injectable()
export class Metrics5mRepository extends BucketRepository {
  constructor(sqlite: SqliteProvider) {
    super(sqlite, "metrics_5m");
  }
}
