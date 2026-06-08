import { Injectable } from "@nestjs/common";
import type {
  IUser,
  TwoFactorMethod,
  UserPermissions,
} from "@shared/types/user.types";
import { SqliteProvider } from "../sqlite.provider";

export abstract class IUsersRepository {
  abstract findAll(): IUser[];

  abstract findById(id: string): IUser | null;

  abstract findByUsername(username: string): IUser | null;

  abstract create(user: IUser): void;

  abstract update(user: IUser): void;

  abstract delete(id: string): void;
}

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  findAll(): IUser[] {
    const rows = this.sqlite.connection.query("SELECT * FROM users").all();
    return rows.map((r: any) => this.deserialize(r));
  }

  findById(id: string): IUser | null {
    const row = this.sqlite.connection
      .query("SELECT * FROM users WHERE id = ?")
      .get(id);
    return row ? this.deserialize(row) : null;
  }

  findByUsername(username: string): IUser | null {
    const row = this.sqlite.connection
      .query("SELECT * FROM users WHERE username = ?")
      .get(username);
    return row ? this.deserialize(row) : null;
  }

  create(user: IUser): void {
    const stmt = this.sqlite.connection.prepare(`INSERT INTO users
      (id, username, password, secret, permissions, serversRestrictEnabled, serversRestrictAllowed, isAdmin, oobeCompleted,
       totpSecret, totpEnabled, telegram2faEnabled, twofaPrimary, notifyTaskResults, dashboardLayout)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(
      user.id,
      user.username,
      user.password,
      user.secret,
      JSON.stringify(user.permissions),
      user.serversRestrict.enabled ? 1 : 0,
      JSON.stringify(user.serversRestrict.allowed ?? []),
      user.isAdmin ? 1 : null,
      user.oobeCompleted ? 1 : 0,
      user.totpSecret ?? null,
      user.totpEnabled ? 1 : 0,
      user.telegram2faEnabled ? 1 : 0,
      user.twofaPrimary ?? null,
      user.notifyTaskResults ? 1 : 0,
      user.dashboardLayout ?? null,
    );
  }

  update(user: IUser): void {
    const stmt = this.sqlite.connection.prepare(`UPDATE users SET
      username = ?, password = ?, secret = ?, permissions = ?,
      serversRestrictEnabled = ?, serversRestrictAllowed = ?, isAdmin = ?, oobeCompleted = ?,
      totpSecret = ?, totpEnabled = ?, telegram2faEnabled = ?, twofaPrimary = ?, notifyTaskResults = ?, dashboardLayout = ?
      WHERE id = ?`);
    stmt.run(
      user.username,
      user.password,
      user.secret,
      JSON.stringify(user.permissions),
      user.serversRestrict.enabled ? 1 : 0,
      JSON.stringify(user.serversRestrict.allowed ?? []),
      user.isAdmin ? 1 : null,
      user.oobeCompleted ? 1 : 0,
      user.totpSecret ?? null,
      user.totpEnabled ? 1 : 0,
      user.telegram2faEnabled ? 1 : 0,
      user.twofaPrimary ?? null,
      user.notifyTaskResults ? 1 : 0,
      user.dashboardLayout ?? null,
      user.id,
    );
  }

  delete(id: string): void {
    this.sqlite.connection.prepare("DELETE FROM users WHERE id = ?").run(id);
  }

  private deserialize(row: any): IUser {
    return {
      id: String(row.id),
      username: String(row.username),
      password: String(row.password),
      secret: String(row.secret),
      permissions: JSON.parse(row.permissions || "[]") as UserPermissions[],
      serversRestrict: {
        enabled: !!row.serversRestrictEnabled,
        allowed: JSON.parse(row.serversRestrictAllowed || "[]") as string[],
      },
      isAdmin: row.isAdmin == null ? undefined : !!row.isAdmin,
      oobeCompleted: !!row.oobeCompleted,
      totpSecret: row.totpSecret ?? null,
      totpEnabled: !!row.totpEnabled,
      telegram2faEnabled: !!row.telegram2faEnabled,
      twofaPrimary: (row.twofaPrimary ?? null) as TwoFactorMethod | null,
      notifyTaskResults: !!row.notifyTaskResults,
      dashboardLayout: row.dashboardLayout ?? null,
    };
  }
}
