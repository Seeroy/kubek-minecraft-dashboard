import type { Database } from "bun:sqlite";
import { count, plural, rebuildTable } from "./migration.types";

// Permissions and allowed servers get their own tables instead of JSON,
// users.secret was never used
export function userAccess(db: Database, log: (message: string) => void): void {
  db.run(`CREATE TABLE user_permissions (
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission TEXT NOT NULL,
    PRIMARY KEY (userId, permission)
  )`);

  db.run(`CREATE TABLE user_server_access (
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    serverId TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    PRIMARY KEY (userId, serverId)
  )`);
  db.run(
    "CREATE INDEX idx_user_server_access_server_id ON user_server_access (serverId)",
  );

  const unreadable = db
    .query(
      `SELECT username FROM users
        WHERE NOT json_valid(permissions) OR NOT json_valid(serversRestrictAllowed)`,
    )
    .all() as { username: string }[];
  for (const { username } of unreadable) {
    log(
      `user "${username}" has unreadable permissions or server list, skipped`,
    );
  }

  db.run(`INSERT OR IGNORE INTO user_permissions (userId, permission)
    SELECT u.id, j.value
      FROM users u, json_each(u.permissions) j
     WHERE json_valid(u.permissions) AND j.type = 'text'`);

  // Ids of deleted servers are skipped
  const referenced = db
    .query(
      `SELECT COUNT(*) AS c FROM users u, json_each(u.serversRestrictAllowed) j
        WHERE json_valid(u.serversRestrictAllowed)`,
    )
    .get() as { c: number };
  db.run(`INSERT OR IGNORE INTO user_server_access (userId, serverId)
    SELECT u.id, s.id
      FROM users u, json_each(u.serversRestrictAllowed) j
      JOIN servers s ON s.id = j.value
     WHERE json_valid(u.serversRestrictAllowed)`);
  const dropped = Number(referenced.c) - count(db, "user_server_access");
  if (dropped > 0)
    log(
      `removed ${plural(dropped, "access entry", "access entries")} for deleted servers`,
    );

  rebuildTable(db, "users", {
    define: (name) => `CREATE TABLE ${name} (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      isAdmin INTEGER NOT NULL DEFAULT 0,
      serversRestrictEnabled INTEGER NOT NULL DEFAULT 0,
      oobeCompleted INTEGER NOT NULL DEFAULT 0,
      totpSecret TEXT,
      totpEnabled INTEGER NOT NULL DEFAULT 0,
      telegram2faEnabled INTEGER NOT NULL DEFAULT 0,
      twofaPrimary TEXT,
      notifyTaskResults INTEGER NOT NULL DEFAULT 0,
      dashboardLayout TEXT,
      lastSeenWhatsNewVersion TEXT,
      skinName TEXT
    )`,
    columns: `id, username, password, isAdmin, serversRestrictEnabled, oobeCompleted,
      totpSecret, totpEnabled, telegram2faEnabled, twofaPrimary, notifyTaskResults,
      dashboardLayout, lastSeenWhatsNewVersion, skinName`,
    select: `SELECT id, username, password,
      CASE WHEN isAdmin THEN 1 ELSE 0 END,
      CASE WHEN serversRestrictEnabled THEN 1 ELSE 0 END,
      oobeCompleted, totpSecret, totpEnabled, telegram2faEnabled, twofaPrimary,
      notifyTaskResults, dashboardLayout, lastSeenWhatsNewVersion, skinName
      FROM users`,
  });
}
