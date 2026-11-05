import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { companionFeed } from "./021-companion-feed";
import { MIGRATIONS } from "./index";

function migrated(): Database {
  const db = new Database(":memory:");
  db.run("PRAGMA foreign_keys = OFF");
  for (const m of MIGRATIONS.filter((m) => m.version <= 20)) m.up(db, () => {});
  return db;
}

test("feed switches show up on, existing rows keep their chat setting", () => {
  const db = migrated();
  db.run(`INSERT INTO companion_settings (serverId, chat) VALUES ('s1', 1)`);
  db.run(
    `INSERT INTO companion_events (serverId, ts, type) VALUES ('s1', 1, 'advancement'), ('s1', 2, 'join')`,
  );

  companionFeed(db);

  expect(
    db
      .query("SELECT sessions, kicks, deaths, chat FROM companion_settings")
      .get(),
  ).toEqual({
    sessions: 1,
    kicks: 1,
    deaths: 1,
    chat: 1,
  });
  expect(db.query("SELECT type FROM companion_events").all()).toEqual([
    { type: "join" },
  ]);
});

test("running it twice is harmless", () => {
  const db = migrated();
  companionFeed(db);
  expect(() => companionFeed(db)).not.toThrow();
});
