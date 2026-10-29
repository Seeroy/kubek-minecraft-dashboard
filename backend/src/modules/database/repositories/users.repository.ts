import { Injectable } from "@nestjs/common";
import {
  type AccessArea,
  type AccessLevel,
  type AccessMap,
  isAccessArea,
  isAreaLevel,
  mergeAccess,
} from "@shared/access/areas";
import type { IUser, TwoFactorMethod } from "@shared/types/user.types";
import { SqliteProvider } from "../sqlite.provider";

export abstract class IUsersRepository {
  abstract findAll(): IUser[];

  abstract findById(id: string): IUser | null;

  abstract findByUsername(username: string): IUser | null;

  abstract create(user: IUser): void;

  abstract update(user: IUser): void;

  abstract delete(id: string): void;
}

// Access parts and allowed servers are loaded from their tables as JSON
const SELECT_USER = `SELECT u.*,
  (SELECT json_group_array(roleId) FROM
    (SELECT roleId FROM user_roles WHERE userId = u.id ORDER BY rowid)) AS rolesJson,
  (SELECT json_group_object(area, level) FROM user_grants WHERE userId = u.id) AS grantsJson,
  (SELECT json_group_array(permission) FROM
    (SELECT permission FROM user_permissions WHERE userId = u.id ORDER BY rowid)) AS extJson,
  (SELECT json_group_array(json_array(rg.area, rg.level)) FROM user_roles ur
    JOIN role_grants rg ON rg.roleId = ur.roleId WHERE ur.userId = u.id) AS roleGrantsJson,
  (SELECT json_group_array(DISTINCT rp.permission) FROM user_roles ur
    JOIN role_permissions rp ON rp.roleId = ur.roleId WHERE ur.userId = u.id) AS roleExtJson,
  (SELECT json_group_array(serverId) FROM
    (SELECT serverId FROM user_server_access WHERE userId = u.id ORDER BY rowid)) AS allowedJson,
  (SELECT createdAt FROM user_ftp_credentials WHERE userId = u.id) AS ftpPasswordSetAt
  FROM users u`;

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  findAll(): IUser[] {
    const rows = this.sqlite.connection.query(SELECT_USER).all();
    return rows.map((r: any) => this.deserialize(r));
  }

  findById(id: string): IUser | null {
    const row = this.sqlite.connection
      .query(`${SELECT_USER} WHERE u.id = ?`)
      .get(id);
    return row ? this.deserialize(row) : null;
  }

  findByUsername(username: string): IUser | null {
    const row = this.sqlite.connection
      .query(`${SELECT_USER} WHERE u.username = ?`)
      .get(username);
    return row ? this.deserialize(row) : null;
  }

  create(user: IUser): void {
    this.sqlite.connection.transaction(() => {
      this.sqlite.connection
        .prepare(
          `INSERT INTO users
      (id, username, password, isAdmin, serversRestrictEnabled, oobeCompleted,
       totpSecret, telegram2faEnabled, twofaPrimary, dashboardLayout, lastSeenWhatsNewVersion, skinName)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(user.id, ...this.columns(user));
      this.writeAccess(user);
    })();
  }

  update(user: IUser): void {
    this.sqlite.connection.transaction(() => {
      this.sqlite.connection
        .prepare(
          `UPDATE users SET
      username = ?, password = ?, isAdmin = ?, serversRestrictEnabled = ?, oobeCompleted = ?,
      totpSecret = ?, telegram2faEnabled = ?, twofaPrimary = ?, dashboardLayout = ?, lastSeenWhatsNewVersion = ?, skinName = ?
      WHERE id = ?`,
        )
        .run(...this.columns(user), user.id);
      this.writeAccess(user);
    })();
  }

  delete(id: string): void {
    this.sqlite.connection.prepare("DELETE FROM users WHERE id = ?").run(id);
  }

  private columns(user: IUser) {
    return [
      user.username,
      user.password,
      user.isAdmin ? 1 : 0,
      user.serversRestrict.enabled ? 1 : 0,
      user.oobeCompleted ? 1 : 0,
      // TOTP counts as enabled exactly while a secret is stored
      user.totpEnabled ? (user.totpSecret ?? null) : null,
      user.telegram2faEnabled ? 1 : 0,
      user.twofaPrimary ?? null,
      user.dashboardLayout ?? null,
      user.lastSeenWhatsNewVersion ?? null,
      user.skinName ?? null,
    ] as const;
  }

  // Rewrites roles, levels, keys and servers, missing roles and servers are skipped
  private writeAccess(user: IUser): void {
    const db = this.sqlite.connection;
    for (const table of [
      "user_roles",
      "user_grants",
      "user_permissions",
      "user_server_access",
    ]) {
      db.prepare(`DELETE FROM ${table} WHERE userId = ?`).run(user.id);
    }

    const addRole = db.prepare(
      "INSERT OR IGNORE INTO user_roles (userId, roleId) SELECT ?, id FROM roles WHERE id = ?",
    );
    for (const roleId of user.roles) addRole.run(user.id, roleId);

    const addGrant = db.prepare(
      "INSERT INTO user_grants (userId, area, level) VALUES (?, ?, ?)",
    );
    for (const [area, level] of Object.entries(user.grants)) {
      if (isAccessArea(area) && level && isAreaLevel(area, level)) {
        addGrant.run(user.id, area, level);
      }
    }

    const addPermission = db.prepare(
      "INSERT OR IGNORE INTO user_permissions (userId, permission) VALUES (?, ?)",
    );
    for (const key of user.extPermissions) addPermission.run(user.id, key);

    const addServer = db.prepare(
      "INSERT OR IGNORE INTO user_server_access (userId, serverId) SELECT ?, id FROM servers WHERE id = ?",
    );
    for (const serverId of user.serversRestrict.allowed ?? []) {
      addServer.run(user.id, serverId);
    }
  }

  private deserialize(row: any): IUser {
    const grants = levels(JSON.parse(row.grantsJson || "{}"));
    const roleGrants = mergeAccess(
      ...(JSON.parse(row.roleGrantsJson || "[]") as [string, string][]).map(
        ([area, level]) => levels({ [area]: level }),
      ),
    );
    const ext = JSON.parse(row.extJson || "[]") as string[];
    const roleExt = JSON.parse(row.roleExtJson || "[]") as string[];
    return {
      id: String(row.id),
      username: String(row.username),
      password: String(row.password),
      roles: JSON.parse(row.rolesJson || "[]") as string[],
      grants,
      extPermissions: ext,
      access: {
        levels: mergeAccess(grants, roleGrants),
        ext: [...new Set([...ext, ...roleExt])],
      },
      serversRestrict: {
        enabled: !!row.serversRestrictEnabled,
        allowed: JSON.parse(row.allowedJson || "[]") as string[],
      },
      isAdmin: !!row.isAdmin,
      oobeCompleted: !!row.oobeCompleted,
      totpSecret: row.totpSecret ?? null,
      totpEnabled: !!row.totpSecret,
      telegram2faEnabled: !!row.telegram2faEnabled,
      twofaPrimary: (row.twofaPrimary ?? null) as TwoFactorMethod | null,
      dashboardLayout: row.dashboardLayout ?? null,
      lastSeenWhatsNewVersion: row.lastSeenWhatsNewVersion ?? null,
      skinName: row.skinName ?? null,
      ftpPasswordSetAt:
        row.ftpPasswordSetAt == null ? null : Number(row.ftpPasswordSetAt),
    };
  }
}

// Rows written by a newer build may carry areas this one doesn't know
function levels(raw: Record<string, string>): AccessMap {
  const map: AccessMap = {};
  for (const [area, level] of Object.entries(raw)) {
    if (isAccessArea(area) && isAreaLevel(area, level)) {
      map[area as AccessArea] = level as AccessLevel;
    }
  }
  return map;
}
