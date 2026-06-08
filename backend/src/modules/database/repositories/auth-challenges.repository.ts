import { Injectable } from "@nestjs/common";
import { SqliteProvider } from "../sqlite.provider";

export type AuthChallengeMethod = "totp" | "telegram";
export type AuthChallengeStatus =
  | "pending"
  | "approved"
  | "denied"
  | "expired"
  | "consumed";

export interface IAuthChallenge {
  id: string;
  userId: string;
  method: AuthChallengeMethod;
  status: AuthChallengeStatus;
  tgChatId: number | null;
  tgMessageId: number | null;
  ip: string | null;
  userAgent: string | null;
  issuedToken: string | null;
  createdAt: number;
  expiresAt: number;
  resolvedAt: number | null;
  attempts: number;
}

@Injectable()
export class AuthChallengesRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  create(challenge: IAuthChallenge): void {
    this.sqlite.connection
      .prepare(
        `INSERT INTO auth_challenges (id, userId, method, status, tgChatId, tgMessageId, ip, userAgent, issuedToken, createdAt, expiresAt, resolvedAt, attempts)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        challenge.id,
        challenge.userId,
        challenge.method,
        challenge.status,
        challenge.tgChatId,
        challenge.tgMessageId,
        challenge.ip,
        challenge.userAgent,
        challenge.issuedToken,
        challenge.createdAt,
        challenge.expiresAt,
        challenge.resolvedAt,
        challenge.attempts,
      );
  }

  findById(id: string): IAuthChallenge | null {
    const row = this.sqlite.connection
      .prepare("SELECT * FROM auth_challenges WHERE id = ?")
      .get(id);
    return row ? this.deserialize(row) : null;
  }

  update(challenge: IAuthChallenge): void {
    this.sqlite.connection
      .prepare(
        `UPDATE auth_challenges SET method = ?, status = ?, tgChatId = ?, tgMessageId = ?, issuedToken = ?, resolvedAt = ?, expiresAt = ?, attempts = ?
         WHERE id = ?`,
      )
      .run(
        challenge.method,
        challenge.status,
        challenge.tgChatId,
        challenge.tgMessageId,
        challenge.issuedToken,
        challenge.resolvedAt,
        challenge.expiresAt,
        challenge.attempts,
        challenge.id,
      );
  }

  delete(id: string): void {
    this.sqlite.connection
      .prepare("DELETE FROM auth_challenges WHERE id = ?")
      .run(id);
  }

  deleteExpired(): void {
    this.sqlite.connection
      .prepare(
        "DELETE FROM auth_challenges WHERE expiresAt < ? OR (status IN ('consumed', 'denied') AND resolvedAt IS NOT NULL AND resolvedAt < ?)",
      )
      .run(Date.now(), Date.now() - 60 * 60 * 1000);
  }

  private deserialize(row: any): IAuthChallenge {
    return {
      id: String(row.id),
      userId: String(row.userId),
      method: row.method as AuthChallengeMethod,
      status: row.status as AuthChallengeStatus,
      tgChatId: row.tgChatId ?? null,
      tgMessageId: row.tgMessageId ?? null,
      ip: row.ip ?? null,
      userAgent: row.userAgent ?? null,
      issuedToken: row.issuedToken ?? null,
      createdAt: Number(row.createdAt),
      expiresAt: Number(row.expiresAt),
      resolvedAt: row.resolvedAt == null ? null : Number(row.resolvedAt),
      attempts: Number(row.attempts ?? 0),
    };
  }
}
