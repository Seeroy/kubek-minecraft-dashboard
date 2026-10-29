import type { Database } from "bun:sqlite";
import { plural } from "./migration.types";

type Level = "read" | "write" | "manage";
type Grants = Record<string, Level>;

// Frozen copy, later changes to shared/access must not change what this step did
const LEGACY: Record<string, Grants> = {
  servers_view: {
    console: "read",
    power: "read",
    players: "read",
    networks: "read",
  },
  servers_control: { console: "write", power: "manage", players: "write" },
  servers_configure: {
    settings: "manage",
    players: "manage",
    networks: "manage",
    servers: "manage",
  },
  servers_create: { servers: "write" },
  file_manager: { files: "manage" },
  plugins_mgr: { content: "manage" },
  backups: { backups: "manage", storages: "read" },
  scheduler_mgr: { scheduler: "manage" },
  java_mgr: { java: "manage" },
  system_monitoring: { monitoring: "read" },
  audit_log: { audit: "read" },
  ai_assistant: { assistant: "read" },
  accounts_mgr: { accounts: "write" },
  kubek_settings: {
    panel: "manage",
    integrations: "manage",
    storages: "manage",
    audit: "manage",
    assistant: "manage",
  },
};

const VIEWER: Grants = {
  console: "read",
  power: "read",
  settings: "read",
  content: "read",
  players: "read",
  backups: "read",
  scheduler: "read",
  networks: "read",
};
const MODERATOR: Grants = {
  ...VIEWER,
  console: "write",
  power: "write",
  players: "manage",
};
const OPERATOR: Grants = {
  ...MODERATOR,
  settings: "write",
  files: "write",
  content: "write",
  backups: "write",
  scheduler: "write",
};
const SERVER_ADMIN: Grants = {
  console: "write",
  power: "manage",
  settings: "manage",
  files: "manage",
  content: "manage",
  players: "manage",
  backups: "manage",
  scheduler: "manage",
  servers: "manage",
  networks: "manage",
  java: "write",
};

const BUILTIN: [key: string, name: string, grants: Grants][] = [
  ["viewer", "Viewer", VIEWER],
  ["moderator", "Moderator", MODERATOR],
  ["operator", "Operator", OPERATOR],
  ["server-admin", "Server admin", SERVER_ADMIN],
];

const RANK: Record<Level, number> = { read: 1, write: 2, manage: 3 };

// Flat permissions become levels per area, extension keys stay as they are
export function accessLevels(
  db: Database,
  log: (message: string) => void,
): void {
  db.run(`CREATE TABLE roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    description TEXT,
    builtinKey TEXT UNIQUE,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`);
  db.run(`CREATE TABLE role_grants (
    roleId TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    area TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('read', 'write', 'manage')),
    PRIMARY KEY (roleId, area)
  )`);
  db.run(`CREATE TABLE role_permissions (
    roleId TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission TEXT NOT NULL,
    PRIMARY KEY (roleId, permission)
  )`);
  db.run(`CREATE TABLE user_roles (
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    roleId TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (userId, roleId)
  )`);
  db.run("CREATE INDEX idx_user_roles_role_id ON user_roles (roleId)");
  db.run(`CREATE TABLE user_grants (
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    area TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('read', 'write', 'manage')),
    PRIMARY KEY (userId, area)
  )`);

  const now = Date.now();
  const addRole = db.prepare(
    "INSERT INTO roles (id, name, description, builtinKey, createdAt, updatedAt) VALUES (?, ?, NULL, ?, ?, ?)",
  );
  const addRoleGrant = db.prepare(
    "INSERT INTO role_grants (roleId, area, level) VALUES (?, ?, ?)",
  );
  for (const [key, name, grants] of BUILTIN) {
    addRole.run(`builtin:${key}`, name, key, now, now);
    for (const [area, level] of Object.entries(grants)) {
      addRoleGrant.run(`builtin:${key}`, area, level);
    }
  }

  const rows = db
    .query("SELECT userId, permission FROM user_permissions")
    .all() as { userId: string; permission: string }[];
  const perUser = new Map<string, Grants>();
  for (const { userId, permission } of rows) {
    const mapped = LEGACY[permission];
    if (!mapped) continue;
    const grants = perUser.get(userId) ?? {};
    for (const [area, level] of Object.entries(mapped)) {
      const current = grants[area];
      if (!current || RANK[level] > RANK[current]) grants[area] = level;
    }
    perUser.set(userId, grants);
  }

  const addUserGrant = db.prepare(
    "INSERT INTO user_grants (userId, area, level) VALUES (?, ?, ?)",
  );
  for (const [userId, grants] of perUser) {
    for (const [area, level] of Object.entries(grants)) {
      addUserGrant.run(userId, area, level);
    }
  }

  const legacyKeys = Object.keys(LEGACY);
  db.run(
    `DELETE FROM user_permissions WHERE permission IN (${legacyKeys.map(() => "?").join(", ")})`,
    legacyKeys,
  );

  if (perUser.size > 0) {
    log(
      `moved permissions of ${plural(perUser.size, "account", "accounts")} to access levels`,
    );
  }
}
