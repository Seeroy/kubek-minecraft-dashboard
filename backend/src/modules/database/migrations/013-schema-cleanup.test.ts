import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { MIGRATIONS } from "./index";
import { schemaCleanup } from "./013-schema-cleanup";

function databaseAt(version: number): Database {
  const db = new Database(":memory:");
  db.run("PRAGMA foreign_keys = OFF");
  for (const m of MIGRATIONS.filter((m) => m.version <= version))
    m.up(db, () => {});
  return db;
}

function seed(db: Database): void {
  db.run(
    `INSERT INTO users (id, username, password) VALUES ('u1', 'kubek', 'x')`,
  );
  db.run(`INSERT INTO servers (id, name, status, restartEnabled, restartAttempts, blueprintId)
    VALUES ('s1', 'Survival', 'stopped', 1, 3, 'com.kubek.paper')`);
  db.run(`INSERT INTO backups (id, name, type, status, progress, createdAt, updatedAt, serverId,
      selectedFiles, exclusions, format)
    VALUES ('b1', 'partial', 'partial', 'completed', 100, 1, 1, 's1',
      '[{"name":"world","path":"world"},{"name":"ops.json","path":"ops.json"}]', '["*.log"]', 'zip')`);
  db.run(`INSERT INTO backup_copies (id, backupId, storageId, objectKey, size, status, createdAt, updatedAt)
    VALUES ('c1', 'b1', NULL, 's1/b1.zip', 10, 'ready', 1, 1), ('c2', 'b1', NULL, 's1/b1.zip', 10, 'ready', 2, 2)`);
  db.run(`INSERT INTO backup_journal (id, serverId, backupId, backupName, op, status, actor, createdAt)
    VALUES ('j1', 's1', 'b1', 'partial', 'create', 'success', 'scheduler', 1),
           ('j2', 's1', 'b1', 'partial', 'restore', 'success', 'u1', 2),
           ('j3', 'gone', NULL, NULL, 'create', 'failed', 'system', 3)`);
  db.run(`INSERT INTO audit_logs (id, userId, username, action, category, result, createdAt)
    VALUES ('a1', 'deleted-user', 'old', 'auth.login', 'auth', 'success', 1)`);
}

test("schema cleanup moves data into the new shape", () => {
  const db = databaseAt(12);
  seed(db);
  schemaCleanup(db, () => {});

  expect(
    db
      .query(
        "SELECT kind, position, path FROM backup_file_rules ORDER BY kind, position",
      )
      .all(),
  ).toEqual([
    { kind: "exclude", position: 0, path: "*.log" },
    { kind: "include", position: 0, path: "world" },
    { kind: "include", position: 1, path: "ops.json" },
  ]);
  expect(db.query("SELECT COUNT(*) AS c FROM backup_copies").get()).toEqual({
    c: 1,
  });
  expect(
    db
      .query("SELECT id, trigger, userId FROM backup_journal ORDER BY id")
      .all(),
  ).toEqual([
    { id: "j1", trigger: "scheduler", userId: null },
    { id: "j2", trigger: "user", userId: "u1" },
  ]);
  expect(db.query("SELECT userId FROM audit_logs").get()).toEqual({
    userId: null,
  });

  db.run("PRAGMA foreign_keys = ON");
  expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
});

test("constraints reject what the old schema allowed", () => {
  const db = databaseAt(13);
  db.run("PRAGMA foreign_keys = ON");
  db.run(
    `INSERT INTO users (id, username, password) VALUES ('u1', 'kubek', 'x')`,
  );
  db.run(`INSERT INTO servers (id, name, status, restartEnabled, restartAttempts, blueprintId)
    VALUES ('s1', 'Survival', 'stopped', 1, 3, 'com.kubek.paper')`);
  db.run(`INSERT INTO backups (id, name, type, status, createdAt, updatedAt, serverId)
    VALUES ('b1', 'full', 'full', 'completed', 1, 1, 's1')`);
  db.run(`INSERT INTO backup_copies (id, backupId, objectKey, status, createdAt, updatedAt)
    VALUES ('c1', 'b1', 'k', 'ready', 1, 1)`);

  const insertCopy = (id: string, status: string) =>
    db.run(`INSERT INTO backup_copies (id, backupId, objectKey, status, createdAt, updatedAt)
      VALUES ('${id}', 'b1', 'k', '${status}', 1, 1)`);
  expect(() => insertCopy("c2", "ready")).toThrow();
  expect(() => insertCopy("c3", "paused")).toThrow();
  expect(() =>
    db.run(`INSERT INTO server_modpacks (serverId, source, name, version, installedAt)
      VALUES ('s1', 'modrinth', 'pack', '1', 1)`),
  ).toThrow();
});
