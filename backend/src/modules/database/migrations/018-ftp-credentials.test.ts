import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { ftpCredentials } from "./018-ftp-credentials";
import { MIGRATIONS } from "./index";

function migrated(): Database {
  const db = new Database(":memory:");
  db.run("PRAGMA foreign_keys = OFF");
  for (const m of MIGRATIONS.filter((m) => m.version <= 17)) m.up(db, () => {});
  return db;
}

test("global FTP login is dropped from the config", () => {
  const db = migrated();
  db.run(`INSERT OR REPLACE INTO config_kv (key, value) VALUES
    ('ftpd', '{"enabled":true,"username":"admin","password":"hunter2","port":2121}')`);

  ftpCredentials(db);

  const row = db
    .query("SELECT value FROM config_kv WHERE key = 'ftpd'")
    .get() as { value: string };
  expect(JSON.parse(row.value)).toEqual({ enabled: true, port: 2121 });
});

test("broken ftpd value is left alone", () => {
  const db = migrated();
  db.run(
    `INSERT OR REPLACE INTO config_kv (key, value) VALUES ('ftpd', 'not json')`,
  );
  expect(() => ftpCredentials(db)).not.toThrow();
});

test("credentials go away with the account", () => {
  const db = migrated();
  ftpCredentials(db);
  db.run("PRAGMA foreign_keys = ON");
  db.run(
    `INSERT INTO users (id, username, password) VALUES ('u1', 'kubek', 'x')`,
  );
  db.run(
    `INSERT INTO user_ftp_credentials (userId, password, createdAt) VALUES ('u1', 'hash', 1)`,
  );
  expect(() =>
    db.run(
      `INSERT INTO user_ftp_credentials (userId, password, createdAt) VALUES ('ghost', 'hash', 1)`,
    ),
  ).toThrow();

  db.run("DELETE FROM users WHERE id = 'u1'");
  const left = db.query("SELECT COUNT(*) AS c FROM user_ftp_credentials").get();
  expect(left).toEqual({ c: 0 });
});
