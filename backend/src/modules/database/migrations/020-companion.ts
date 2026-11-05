import type { Database } from "bun:sqlite";

// Kubek Companion: per-server settings, its own metrics and the activity feed
export function companion(db: Database): void {
  db.run(`CREATE TABLE companion_settings (
    serverId TEXT PRIMARY KEY REFERENCES servers(id) ON DELETE CASCADE,
    chat INTEGER NOT NULL DEFAULT 0,
    coords INTEGER NOT NULL DEFAULT 0,
    maintenance TEXT
  )`);

  // Same resolution scheme as metrics, tps and mspt are null when unknown
  db.run(`CREATE TABLE companion_metrics (
    resolution INTEGER NOT NULL,
    serverId TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    ts INTEGER NOT NULL,
    tpsAvg REAL,
    tpsMin REAL,
    msptAvg REAL,
    msptMax REAL,
    heapAvg INTEGER NOT NULL,
    heapMax INTEGER NOT NULL,
    heapLimit INTEGER NOT NULL,
    playersAvg REAL NOT NULL,
    playersMax INTEGER NOT NULL
  )`);
  db.run(
    "CREATE UNIQUE INDEX idx_companion_metrics_key ON companion_metrics (resolution, serverId, ts)",
  );
  db.run(
    "CREATE INDEX idx_companion_metrics_resolution_ts ON companion_metrics (resolution, ts)",
  );

  db.run(`CREATE TABLE companion_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serverId TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    ts INTEGER NOT NULL,
    type TEXT NOT NULL,
    uuid TEXT,
    name TEXT,
    data TEXT
  )`);
  db.run(
    "CREATE INDEX idx_companion_events_server_ts ON companion_events (serverId, ts)",
  );
  db.run(
    "CREATE INDEX idx_companion_events_server_type ON companion_events (serverId, type, ts)",
  );
}
