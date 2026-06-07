import { Injectable } from "@nestjs/common";
import type { IOtpCode } from "@/modules/telegram-bot/telegram.types";
import { SqliteProvider } from "../sqlite.provider";

export abstract class IOtpCodesRepository {
  abstract findAll(): IOtpCode[];

  abstract findById(id: string): IOtpCode | null;

  abstract findByUserId(userId: string): IOtpCode[];

  abstract findValidByUserId(userId: string): IOtpCode | null;

  abstract create(otpCode: IOtpCode): void;

  abstract markAsUsed(id: string): void;

  abstract deleteExpired(): void;

  abstract delete(id: string): void;
}

@Injectable()
export class OtpCodesRepository implements IOtpCodesRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  findAll(): IOtpCode[] {
    const rows = this.sqlite.connection.query("SELECT * FROM otp_codes").all();
    return rows.map((r: any) => this.deserialize(r));
  }

  findById(id: string): IOtpCode | null {
    const row = this.sqlite.connection
      .query("SELECT * FROM otp_codes WHERE id = ?")
      .get(id);
    return row ? this.deserialize(row) : null;
  }

  findByUserId(userId: string): IOtpCode[] {
    const rows = this.sqlite.connection
      .query("SELECT * FROM otp_codes WHERE userId = ? ORDER BY createdAt DESC")
      .all(userId);
    return rows.map((r: any) => this.deserialize(r));
  }

  findValidByUserId(userId: string): IOtpCode | null {
    const now = Date.now();
    const row = this.sqlite.connection
      .query(
        "SELECT * FROM otp_codes WHERE userId = ? AND expiresAt > ? AND used = 0 ORDER BY createdAt DESC LIMIT 1",
      )
      .get(userId, now);
    return row ? this.deserialize(row) : null;
  }

  create(otpCode: IOtpCode): void {
    const stmt = this.sqlite.connection.prepare(`INSERT INTO otp_codes
      (id, userId, codeHash, telegramId, createdAt, expiresAt, used)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(
      otpCode.id,
      otpCode.userId,
      otpCode.codeHash,
      otpCode.telegramId || null,
      otpCode.createdAt,
      otpCode.expiresAt,
      otpCode.used ? 1 : 0,
    );
  }

  markAsUsed(id: string): void {
    this.sqlite.connection
      .prepare("UPDATE otp_codes SET used = 1 WHERE id = ?")
      .run(id);
  }

  deleteExpired(): void {
    const now = Date.now();
    this.sqlite.connection
      .prepare("DELETE FROM otp_codes WHERE expiresAt < ?")
      .run(now);
  }

  delete(id: string): void {
    this.sqlite.connection
      .prepare("DELETE FROM otp_codes WHERE id = ?")
      .run(id);
  }

  private deserialize(row: any): IOtpCode {
    return {
      id: String(row.id),
      userId: String(row.userId),
      codeHash: String(row.codeHash),
      telegramId: row.telegramId ? Number(row.telegramId) : undefined,
      createdAt: Number(row.createdAt),
      expiresAt: Number(row.expiresAt),
      used: !!row.used,
    };
  }
}
