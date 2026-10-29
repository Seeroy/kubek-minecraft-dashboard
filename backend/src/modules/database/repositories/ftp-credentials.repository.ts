import { Injectable } from "@nestjs/common";
import { SqliteProvider } from "../sqlite.provider";

export interface FtpCredential {
  userId: string;
  password: string;
  createdAt: number;
}

/** FTP passwords, kept out of the users table */
@Injectable()
export class FtpCredentialsRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  findByUserId(userId: string): FtpCredential | null {
    const row = this.sqlite.connection
      .query(
        "SELECT userId, password, createdAt FROM user_ftp_credentials WHERE userId = ?",
      )
      .get(userId) as FtpCredential | null;
    return row
      ? {
          userId: String(row.userId),
          password: String(row.password),
          createdAt: Number(row.createdAt),
        }
      : null;
  }

  set(userId: string, password: string, createdAt: number): void {
    this.sqlite.connection
      .prepare(
        `INSERT INTO user_ftp_credentials (userId, password, createdAt) VALUES (?, ?, ?)
        ON CONFLICT(userId) DO UPDATE SET password = excluded.password, createdAt = excluded.createdAt`,
      )
      .run(userId, password, createdAt);
  }

  delete(userId: string): boolean {
    const result = this.sqlite.connection
      .prepare("DELETE FROM user_ftp_credentials WHERE userId = ?")
      .run(userId);
    return result.changes > 0;
  }
}
