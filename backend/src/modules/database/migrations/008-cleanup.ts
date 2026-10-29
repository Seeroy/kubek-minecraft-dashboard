import type { Database } from "bun:sqlite";

// Old configuration table nobody reads and an index that repeats the PK
export function cleanup(db: Database): void {
  db.run("DROP TABLE IF EXISTS configuration");
  db.run("DROP INDEX IF EXISTS idx_telegram_users_telegram_id");
}
