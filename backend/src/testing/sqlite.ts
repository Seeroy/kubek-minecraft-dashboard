import { Database } from "bun:sqlite";
import { runMigrations } from "@/modules/database/migrations/migration-runner";
import type { SqliteProvider } from "@/modules/database/sqlite.provider";
import { fake } from "./fake";

// opened like the real one, latest schema
export function memoryDatabase(): Database {
  const db = new Database(":memory:", { strict: true });
  runMigrations(db, ":memory:");
  return db;
}

export function sqliteProvider(db: Database = memoryDatabase()): SqliteProvider {
  return fake<SqliteProvider>({ connection: db });
}
