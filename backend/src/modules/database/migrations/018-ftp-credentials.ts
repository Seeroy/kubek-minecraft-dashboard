import type { Database } from "bun:sqlite";

// FTP password per account, the old global FTP login goes away
export function ftpCredentials(db: Database): void {
  db.run(`CREATE TABLE IF NOT EXISTS user_ftp_credentials (
    userId TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    password TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  )`);

  db.run(`UPDATE config_kv
    SET value = json_remove(value, '$.username', '$.password')
    WHERE key = 'ftpd' AND json_valid(value)`);
}
