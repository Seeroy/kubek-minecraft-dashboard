import type { Database } from "bun:sqlite";
import { count, plural } from "./migration.types";

// Three metrics tables become one with a resolution column.
// serverId is a real foreign key now, NULL means the host
export function metrics(db: Database, log: (message: string) => void): void {
  db.run(`CREATE TABLE metrics (
    resolution INTEGER NOT NULL,
    serverId TEXT REFERENCES servers(id) ON DELETE CASCADE,
    ts INTEGER NOT NULL,
    cpuAvg REAL NOT NULL,
    cpuMax REAL NOT NULL,
    ramAvg INTEGER NOT NULL,
    ramMax INTEGER NOT NULL,
    ramTotal INTEGER NOT NULL
  )`);
  db.run(
    "CREATE UNIQUE INDEX idx_metrics_key ON metrics (resolution, IFNULL(serverId, ''), ts)",
  );
  db.run("CREATE INDEX idx_metrics_resolution_ts ON metrics (resolution, ts)");
  db.run("CREATE INDEX idx_metrics_server_id ON metrics (serverId)");

  const serverId = `CASE WHEN scope = 'system' THEN NULL ELSE substr(scope, 8) END`;
  const known = `(scope = 'system' OR (scope LIKE 'server:%' AND substr(scope, 8) IN (SELECT id FROM servers)))`;

  const sources = [
    {
      table: "metrics_raw",
      resolution: 0,
      values: "cpu, cpu, ram_used, ram_used, ram_total",
    },
    {
      table: "metrics_1m",
      resolution: 60_000,
      values: "cpu_avg, cpu_max, ram_avg, ram_max, ram_total",
    },
    {
      table: "metrics_5m",
      resolution: 300_000,
      values: "cpu_avg, cpu_max, ram_avg, ram_max, ram_total",
    },
  ];

  let orphaned = 0;
  for (const source of sources) {
    orphaned += count(db, source.table, `WHERE NOT ${known}`);
    db.run(`INSERT OR IGNORE INTO metrics
      (resolution, serverId, ts, cpuAvg, cpuMax, ramAvg, ramMax, ramTotal)
      SELECT ${source.resolution}, ${serverId}, ts, ${source.values}
        FROM ${source.table} WHERE ${known}`);
    db.run(`DROP TABLE ${source.table}`);
  }
  if (orphaned > 0)
    log(
      `removed ${plural(orphaned, "metrics sample", "metrics samples")} of deleted servers`,
    );
}
