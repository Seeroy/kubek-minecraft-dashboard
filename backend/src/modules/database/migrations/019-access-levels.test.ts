import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  LEGACY_PERMISSION_ACCESS,
  legacyFromAccess,
} from "@shared/access/legacy";
import { BUILTIN_ROLES } from "@shared/access/roles";
import { accessLevels } from "./019-access-levels";
import { MIGRATIONS } from "./index";
import { runMigrations, schemaVersion } from "./migration-runner";

const LEGACY_KEYS = Object.keys(LEGACY_PERMISSION_ACCESS);

function databaseAt(version: number): Database {
  const db = new Database(":memory:");
  db.run("PRAGMA foreign_keys = OFF");
  for (const m of MIGRATIONS.filter((m) => m.version <= version)) {
    m.up(db, () => {});
  }
  db.run(`PRAGMA user_version = ${version}`);
  return db;
}

function addUser(db: Database, id: string, permissions: string[]): void {
  db.run("INSERT INTO users (id, username, password) VALUES (?, ?, 'x')", [
    id,
    id,
  ]);
  for (const permission of permissions) {
    db.run("INSERT INTO user_permissions (userId, permission) VALUES (?, ?)", [
      id,
      permission,
    ]);
  }
}

function grantsOf(db: Database, userId: string): Record<string, string> {
  const rows = db
    .query("SELECT area, level FROM user_grants WHERE userId = ?")
    .all(userId) as { area: string; level: string }[];
  return Object.fromEntries(rows.map((r) => [r.area, r.level]));
}

function keysOf(db: Database, userId: string): string[] {
  return (
    db
      .query(
        "SELECT permission FROM user_permissions WHERE userId = ? ORDER BY permission",
      )
      .all(userId) as { permission: string }[]
  ).map((r) => r.permission);
}

describe("access levels migration", () => {
  test.each(LEGACY_KEYS)("%s becomes its levels", (key) => {
    const db = databaseAt(18);
    addUser(db, "u", [key]);

    accessLevels(db, () => {});

    expect(grantsOf(db, "u")).toEqual(
      LEGACY_PERMISSION_ACCESS[key] as Record<string, string>,
    );
    expect(keysOf(db, "u")).toEqual([]);
  });

  test("several permissions keep the highest level per area", () => {
    const db = databaseAt(18);
    addUser(db, "u", ["servers_view", "servers_control", "servers_configure"]);

    accessLevels(db, () => {});

    expect(grantsOf(db, "u")).toEqual({
      console: "write",
      power: "manage",
      players: "manage",
      networks: "manage",
      settings: "manage",
      servers: "manage",
    });
  });

  test("nobody loses an old permission", () => {
    const db = databaseAt(18);
    const sets = [
      LEGACY_KEYS,
      ["servers_view", "file_manager"],
      ["backups", "kubek_settings"],
      ["accounts_mgr", "audit_log", "ai_assistant"],
      ["servers_control"],
    ];
    sets.forEach((set, i) => addUser(db, `u${i}`, set));

    accessLevels(db, () => {});

    sets.forEach((set, i) => {
      const kept = legacyFromAccess(grantsOf(db, `u${i}`));
      expect(kept).toEqual(expect.arrayContaining(set));
    });
  });

  test("extension permissions and unknown keys stay with the account", () => {
    const db = databaseAt(18);
    addUser(db, "u", ["servers_view", "ext.discord.configure"]);

    accessLevels(db, () => {});

    expect(keysOf(db, "u")).toEqual(["ext.discord.configure"]);
  });

  test("an account without permissions gets no levels", () => {
    const db = databaseAt(18);
    addUser(db, "u", []);
    const messages: string[] = [];

    accessLevels(db, (m) => messages.push(m));

    expect(grantsOf(db, "u")).toEqual({});
    expect(messages).toEqual([]);
  });

  test("built-in roles match the shared ones", () => {
    const db = databaseAt(18);

    accessLevels(db, () => {});

    for (const role of BUILTIN_ROLES) {
      const rows = db
        .query("SELECT area, level FROM role_grants WHERE roleId = ?")
        .all(`builtin:${role.key}`) as { area: string; level: string }[];
      expect(Object.fromEntries(rows.map((r) => [r.area, r.level]))).toEqual(
        role.grants as Record<string, string>,
      );
    }
    expect(db.query("SELECT COUNT(*) AS c FROM user_roles").get()).toEqual({
      c: 0,
    });
  });

  test("a real upgrade from v18 passes the foreign key check", () => {
    const db = databaseAt(18);
    addUser(db, "u", ["servers_view", "ext.x"]);
    db.run("PRAGMA foreign_keys = ON");

    // The upgrade backs the old database up next to the given path
    const dir = mkdtempSync(join(tmpdir(), "kubek-019-"));
    try {
      runMigrations(db, join(dir, "db.sql"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }

    expect(schemaVersion(db)).toBe(19);
    expect(grantsOf(db, "u").console).toBe("read");
  });

  test("levels, roles and keys go away with the account", () => {
    const db = databaseAt(18);
    addUser(db, "u", ["servers_view", "ext.x"]);
    accessLevels(db, () => {});
    db.run("PRAGMA foreign_keys = ON");
    db.run(
      "INSERT INTO user_roles (userId, roleId) VALUES ('u', 'builtin:viewer')",
    );

    db.run("DELETE FROM users WHERE id = 'u'");

    for (const table of ["user_grants", "user_roles", "user_permissions"]) {
      expect(db.query(`SELECT COUNT(*) AS c FROM ${table}`).get()).toEqual({
        c: 0,
      });
    }
  });
});
