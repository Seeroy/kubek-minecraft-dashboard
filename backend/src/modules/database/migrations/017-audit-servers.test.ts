import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { auditServers } from "./017-audit-servers";
import { MIGRATIONS } from "./index";

test("old entries get the server they recorded", () => {
  const db = new Database(":memory:");
  db.run("PRAGMA foreign_keys = OFF");
  for (const m of MIGRATIONS.filter((m) => m.version <= 16)) m.up(db, () => {});

  db.run(`INSERT INTO servers (id, name, status, restartEnabled, restartAttempts, blueprintId)
    VALUES ('s1', 'Survival', 'stopped', 1, 3, 'com.kubek.paper')`);
  db.run(`INSERT INTO backups (id, name, type, status, createdAt, updatedAt, serverId, format)
    VALUES ('b1', 'nightly', 'full', 'completed', 1, 1, 's1', 'zip')`);
  const insert = db.prepare(`INSERT INTO audit_logs
    (id, username, action, category, resourceType, resourceId, resourceName, details, result, createdAt)
    VALUES (?, 'kubek', 'x', 'server', ?, ?, ?, ?, 'success', 1)`);
  insert.run("start", "server", "s1", "Old name", null);
  insert.run("player", "player", "s1", "Notch", '{"serverId":"s1"}');
  insert.run("restore", "backup", "b1", "nightly", null);
  insert.run("login", null, null, null, null);

  auditServers(db);

  const rows = db
    .query("SELECT id, serverId, serverName FROM audit_logs ORDER BY id")
    .all();
  expect(rows).toEqual([
    { id: "login", serverId: null, serverName: null },
    { id: "player", serverId: "s1", serverName: "Survival" },
    { id: "restore", serverId: "s1", serverName: "Survival" },
    { id: "start", serverId: "s1", serverName: "Old name" },
  ]);
});
