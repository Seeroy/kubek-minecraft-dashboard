import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { companion } from "./020-companion";
import { MIGRATIONS } from "./index";

function migrated(): Database {
  const db = new Database(":memory:");
  db.run("PRAGMA foreign_keys = OFF");
  for (const m of MIGRATIONS.filter((m) => m.version <= 19)) m.up(db, () => {});
  companion(db);
  db.run("PRAGMA foreign_keys = ON");
  return db;
}

test("companion rows go away with the server", () => {
  const db = migrated();
  db.run(
    `INSERT INTO servers (id, name, status, restartEnabled, restartAttempts, blueprintId) VALUES ('s1', 'Survival', 'stopped', 0, 0, 'com.kubek.paper')`,
  );
  db.run(`INSERT INTO companion_settings (serverId, chat) VALUES ('s1', 1)`);
  db.run(
    `INSERT INTO companion_metrics VALUES (0, 's1', 1, 20, 20, 1, 1, 10, 10, 100, 1, 1)`,
  );
  db.run(
    `INSERT INTO companion_events (serverId, ts, type) VALUES ('s1', 1, 'join')`,
  );

  db.run(`DELETE FROM servers WHERE id = 's1'`);

  for (const table of [
    "companion_settings",
    "companion_metrics",
    "companion_events",
  ]) {
    const row = db.query(`SELECT COUNT(*) AS n FROM ${table}`).get() as {
      n: number;
    };
    expect(row.n).toBe(0);
  }
});

test("one metrics row per resolution, server and time", () => {
  const db = migrated();
  db.run(
    `INSERT INTO servers (id, name, status, restartEnabled, restartAttempts, blueprintId) VALUES ('s1', 'Survival', 'stopped', 0, 0, 'com.kubek.paper')`,
  );
  const insert = `INSERT OR REPLACE INTO companion_metrics VALUES (0, 's1', 1, ?, 20, 1, 1, 10, 10, 100, 1, 1)`;
  db.run(insert, [19]);
  db.run(insert, [18]);
  const rows = db.query("SELECT tpsAvg FROM companion_metrics").all() as {
    tpsAvg: number;
  }[];
  expect(rows).toEqual([{ tpsAvg: 18 }]);
});
