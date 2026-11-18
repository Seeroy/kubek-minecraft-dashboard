import type { Database } from "bun:sqlite";
import { columnsOf } from "./migration.types";

// Personal API keys, and which key an audit entry came with
export function apiKeys(db: Database): void {
  db.run(`CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    prefix TEXT NOT NULL,
    tokenHash TEXT NOT NULL UNIQUE,
    grants TEXT NOT NULL DEFAULT '{}',
    servers TEXT,
    mcp INTEGER NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL,
    expiresAt INTEGER,
    lastUsedAt INTEGER,
    lastUsedIp TEXT
  )`);
  db.run("CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(userId)");

  const columns = columnsOf(db, "audit_logs");
  if (!columns.includes("apiKeyId")) {
    db.run("ALTER TABLE audit_logs ADD COLUMN apiKeyId TEXT");
  }
  if (!columns.includes("apiKeyName")) {
    db.run("ALTER TABLE audit_logs ADD COLUMN apiKeyName TEXT");
  }
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_api_key ON audit_logs(apiKeyId)",
  );
}
