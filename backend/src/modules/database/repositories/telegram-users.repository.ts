import { Injectable } from "@nestjs/common";
import type { ITelegramUser } from "@/modules/telegram-bot/telegram.types";
import { SqliteProvider } from "../sqlite.provider";

export abstract class ITelegramUsersRepository {
  abstract findAll(): ITelegramUser[];

  abstract findById(telegramId: number): ITelegramUser | null;

  abstract findByUserId(userId: string): ITelegramUser | null;

  abstract create(telegramUser: ITelegramUser): void;

  abstract update(telegramUser: ITelegramUser): void;

  abstract delete(telegramId: number): void;

  abstract deactivate(telegramId: number): void;
}

@Injectable()
export class TelegramUsersRepository implements ITelegramUsersRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  findAll(): ITelegramUser[] {
    const rows = this.sqlite.connection
      .query("SELECT * FROM telegram_users")
      .all();
    return rows.map((r: any) => this.deserialize(r));
  }

  findById(telegramId: number): ITelegramUser | null {
    const row = this.sqlite.connection
      .query("SELECT * FROM telegram_users WHERE id = ?")
      .get(telegramId);
    return row ? this.deserialize(row) : null;
  }

  findByUserId(userId: string): ITelegramUser | null {
    const row = this.sqlite.connection
      .query("SELECT * FROM telegram_users WHERE userId = ?")
      .get(userId);
    return row ? this.deserialize(row) : null;
  }

  create(telegramUser: ITelegramUser): void {
    const stmt = this.sqlite.connection.prepare(`INSERT INTO telegram_users
      (id, userId, username, firstName, lastName, linkedAt, isActive, language)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(
      telegramUser.id,
      telegramUser.userId,
      telegramUser.username || null,
      telegramUser.firstName || null,
      telegramUser.lastName || null,
      telegramUser.linkedAt,
      telegramUser.isActive ? 1 : 0,
      telegramUser.language || null,
    );
  }

  update(telegramUser: ITelegramUser): void {
    const stmt = this.sqlite.connection.prepare(`UPDATE telegram_users SET
      userId = ?, username = ?, firstName = ?, lastName = ?, linkedAt = ?, isActive = ?, language = ?
      WHERE id = ?`);
    stmt.run(
      telegramUser.userId,
      telegramUser.username || null,
      telegramUser.firstName || null,
      telegramUser.lastName || null,
      telegramUser.linkedAt,
      telegramUser.isActive ? 1 : 0,
      telegramUser.language || null,
      telegramUser.id,
    );
  }

  delete(telegramId: number): void {
    this.sqlite.connection
      .prepare("DELETE FROM telegram_users WHERE id = ?")
      .run(telegramId);
  }

  deactivate(telegramId: number): void {
    this.sqlite.connection
      .prepare("UPDATE telegram_users SET isActive = 0 WHERE id = ?")
      .run(telegramId);
  }

  private deserialize(row: any): ITelegramUser {
    return {
      id: Number(row.id),
      userId: String(row.userId),
      username: row.username ? String(row.username) : undefined,
      firstName: row.firstName ? String(row.firstName) : undefined,
      lastName: row.lastName ? String(row.lastName) : undefined,
      linkedAt: Number(row.linkedAt),
      isActive: !!row.isActive,
      language:
        row.language === "ru" || row.language === "en"
          ? row.language
          : undefined,
    };
  }
}
