import { Injectable } from "@nestjs/common";
import {
  type AccessArea,
  type AccessLevel,
  type AccessMap,
  isAccessArea,
  isAreaLevel,
} from "@shared/access/areas";
import type { IRole } from "@shared/access/roles";
import { SqliteProvider } from "../sqlite.provider";

const SELECT_ROLE = `SELECT r.*,
  (SELECT json_group_object(area, level) FROM role_grants WHERE roleId = r.id) AS grantsJson,
  (SELECT json_group_array(permission) FROM
    (SELECT permission FROM role_permissions WHERE roleId = r.id ORDER BY rowid)) AS extJson
  FROM roles r`;

@Injectable()
export class RolesRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  // Built-in roles first in the order they were seeded, then custom ones by name
  findAll(): IRole[] {
    return this.sqlite.connection
      .query(
        `${SELECT_ROLE} ORDER BY r.builtinKey IS NULL,
          CASE WHEN r.builtinKey IS NOT NULL THEN r.rowid END, r.name COLLATE NOCASE`,
      )
      .all()
      .map((row) => this.deserialize(row));
  }

  findById(id: string): IRole | null {
    const row = this.sqlite.connection
      .query(`${SELECT_ROLE} WHERE r.id = ?`)
      .get(id);
    return row ? this.deserialize(row) : null;
  }

  findByName(name: string): IRole | null {
    const row = this.sqlite.connection
      .query(`${SELECT_ROLE} WHERE r.name = ?`)
      .get(name);
    return row ? this.deserialize(row) : null;
  }

  create(role: IRole): void {
    const db = this.sqlite.connection;
    db.transaction(() => {
      db.prepare(
        "INSERT INTO roles (id, name, description, builtinKey, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(
        role.id,
        role.name,
        role.description,
        role.builtinKey,
        role.createdAt,
        role.updatedAt,
      );
      this.writeAccess(role);
    })();
  }

  update(role: IRole): void {
    const db = this.sqlite.connection;
    db.transaction(() => {
      db.prepare(
        "UPDATE roles SET name = ?, description = ?, updatedAt = ? WHERE id = ?",
      ).run(role.name, role.description, role.updatedAt, role.id);
      this.writeAccess(role);
    })();
  }

  delete(id: string): void {
    this.sqlite.connection.prepare("DELETE FROM roles WHERE id = ?").run(id);
  }

  /** Accounts holding each role, roles without members are left out */
  memberCounts(): Record<string, number> {
    const rows = this.sqlite.connection
      .query("SELECT roleId, COUNT(*) AS c FROM user_roles GROUP BY roleId")
      .all() as { roleId: string; c: number }[];
    return Object.fromEntries(rows.map((r) => [r.roleId, Number(r.c)]));
  }

  memberIds(roleId: string): string[] {
    return (
      this.sqlite.connection
        .query("SELECT userId FROM user_roles WHERE roleId = ?")
        .all(roleId) as { userId: string }[]
    ).map((r) => r.userId);
  }

  private writeAccess(role: IRole): void {
    const db = this.sqlite.connection;
    db.prepare("DELETE FROM role_grants WHERE roleId = ?").run(role.id);
    db.prepare("DELETE FROM role_permissions WHERE roleId = ?").run(role.id);

    const addGrant = db.prepare(
      "INSERT INTO role_grants (roleId, area, level) VALUES (?, ?, ?)",
    );
    for (const [area, level] of Object.entries(role.grants)) {
      if (isAccessArea(area) && level && isAreaLevel(area, level)) {
        addGrant.run(role.id, area, level);
      }
    }
    const addKey = db.prepare(
      "INSERT OR IGNORE INTO role_permissions (roleId, permission) VALUES (?, ?)",
    );
    for (const key of role.ext) addKey.run(role.id, key);
  }

  private deserialize(row: any): IRole {
    const grants: AccessMap = {};
    for (const [area, level] of Object.entries(
      JSON.parse(row.grantsJson || "{}") as Record<string, string>,
    )) {
      if (isAccessArea(area) && isAreaLevel(area, level)) {
        grants[area as AccessArea] = level as AccessLevel;
      }
    }
    return {
      id: String(row.id),
      name: String(row.name),
      description: row.description ?? null,
      builtinKey: row.builtinKey ?? null,
      grants,
      ext: JSON.parse(row.extJson || "[]") as string[],
      createdAt: Number(row.createdAt),
      updatedAt: Number(row.updatedAt),
    };
  }
}
