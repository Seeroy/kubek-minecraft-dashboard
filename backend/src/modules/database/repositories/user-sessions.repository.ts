import { Injectable } from "@nestjs/common";
import type { IUserSession } from "@shared/types/session.types";
import { SqliteProvider } from "../sqlite.provider";

export abstract class IUserSessionsRepository {
  abstract findById(id: string): IUserSession | null;

  abstract findByTokenHash(tokenHash: string, now: number): IUserSession | null;

  abstract findActiveByUserId(userId: string): IUserSession[];

  abstract create(session: IUserSession): void;

  abstract touch(
    id: string,
    lastSeenAt: number,
    expiresAt: number | null,
  ): void;

  abstract revoke(id: string, revokedAt: number): void;

  abstract revokeAllForUser(
    userId: string,
    revokedAt: number,
    exceptId?: string,
  ): void;

  abstract deleteExpired(now: number): void;
}

@Injectable()
export class UserSessionsRepository implements IUserSessionsRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  findById(id: string): IUserSession | null {
    const row = this.sqlite.connection
      .query("SELECT * FROM user_sessions WHERE id = ?")
      .get(id);
    return row ? this.deserialize(row) : null;
  }

  findByTokenHash(tokenHash: string, now: number): IUserSession | null {
    const row = this.sqlite.connection
      .query(
        "SELECT * FROM user_sessions WHERE tokenHash = ? AND revokedAt IS NULL AND (expiresAt IS NULL OR expiresAt > ?)",
      )
      .get(tokenHash, now);
    return row ? this.deserialize(row) : null;
  }

  findActiveByUserId(userId: string): IUserSession[] {
    const rows = this.sqlite.connection
      .query(
        "SELECT * FROM user_sessions WHERE userId = ? AND revokedAt IS NULL ORDER BY lastSeenAt DESC",
      )
      .all(userId);
    return rows.map((r: any) => this.deserialize(r));
  }

  create(session: IUserSession): void {
    const stmt = this.sqlite.connection.prepare(`INSERT INTO user_sessions
      (id, userId, tokenHash, ip, userAgent, createdAt, lastSeenAt, expiresAt, revokedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(
      session.id,
      session.userId,
      session.tokenHash,
      session.ip,
      session.userAgent,
      session.createdAt,
      session.lastSeenAt,
      session.expiresAt,
      session.revokedAt,
    );
  }

  touch(id: string, lastSeenAt: number, expiresAt: number | null): void {
    this.sqlite.connection
      .prepare(
        "UPDATE user_sessions SET lastSeenAt = ?, expiresAt = ? WHERE id = ? AND revokedAt IS NULL",
      )
      .run(lastSeenAt, expiresAt, id);
  }

  revoke(id: string, revokedAt: number): void {
    this.sqlite.connection
      .prepare(
        "UPDATE user_sessions SET revokedAt = ? WHERE id = ? AND revokedAt IS NULL",
      )
      .run(revokedAt, id);
  }

  revokeAllForUser(userId: string, revokedAt: number, exceptId?: string): void {
    if (exceptId) {
      this.sqlite.connection
        .prepare(
          "UPDATE user_sessions SET revokedAt = ? WHERE userId = ? AND id != ? AND revokedAt IS NULL",
        )
        .run(revokedAt, userId, exceptId);
    } else {
      this.sqlite.connection
        .prepare(
          "UPDATE user_sessions SET revokedAt = ? WHERE userId = ? AND revokedAt IS NULL",
        )
        .run(revokedAt, userId);
    }
  }

  deleteExpired(now: number): void {
    this.sqlite.connection
      .prepare(
        "DELETE FROM user_sessions WHERE expiresAt IS NOT NULL AND expiresAt < ?",
      )
      .run(now);
  }

  private deserialize(row: any): IUserSession {
    return {
      id: String(row.id),
      userId: String(row.userId),
      tokenHash: String(row.tokenHash),
      ip: row.ip == null ? null : String(row.ip),
      userAgent: row.userAgent == null ? null : String(row.userAgent),
      createdAt: Number(row.createdAt),
      lastSeenAt: Number(row.lastSeenAt),
      expiresAt: row.expiresAt == null ? null : Number(row.expiresAt),
      revokedAt: row.revokedAt == null ? null : Number(row.revokedAt),
    };
  }
}
