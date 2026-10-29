import type { Database } from "bun:sqlite";
import { rebuildTable } from "./migration.types";

// Drops columns we can compute: cron and runAt from the payload,
// last run from the runs table. Payloads no longer repeat mode and type
export function scheduledTasks(db: Database): void {
  const strip = (column: string, key: string) =>
    `CASE WHEN json_valid(${column}) THEN json_remove(${column}, '$.${key}') ELSE ${column} END`;

  rebuildTable(db, "scheduled_tasks", {
    define: (name) => `CREATE TABLE ${name} (
      id TEXT PRIMARY KEY,
      serverId TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      mode TEXT NOT NULL,
      timezone TEXT,
      schedulePayload TEXT NOT NULL,
      action TEXT NOT NULL,
      actionPayload TEXT NOT NULL,
      ownerId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )`,
    columns: `id, serverId, name, enabled, mode, timezone, schedulePayload,
      action, actionPayload, ownerId, createdAt, updatedAt`,
    select: `SELECT id, serverId, name, enabled, mode, timezone,
      ${strip("schedulePayload", "mode")}, action, ${strip("actionPayload", "type")},
      ownerId, createdAt, updatedAt
      FROM scheduled_tasks`,
    indexes: [
      "CREATE INDEX idx_scheduled_tasks_server_id ON scheduled_tasks (serverId)",
      "CREATE INDEX idx_scheduled_tasks_enabled ON scheduled_tasks (enabled)",
    ],
  });
}
