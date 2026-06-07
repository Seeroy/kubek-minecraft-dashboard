import { Database } from "bun:sqlite";
import * as fs from "fs";
import * as path from "path";

export function readPortBeforeNestInit(): number {
  const dbFilePath = path.join(process.cwd(), "db.sql");
  if (!fs.existsSync(dbFilePath)) fs.writeFileSync(dbFilePath, "");

  const db = new Database(dbFilePath, { create: true, strict: true });
  db.run("PRAGMA foreign_keys = ON;");

  // Ensure KV config exists
  db.run(`CREATE TABLE IF NOT EXISTS config_kv
          (
            key
            TEXT
            PRIMARY
            KEY,
            value
            TEXT
            NOT
            NULL
          );`);
  db.run(`INSERT
  OR IGNORE INTO config_kv (key, value) VALUES ('port', '8000');`);

  const row = db
    .query("SELECT value FROM config_kv WHERE key = ?")
    .get("port") as { value: string } | undefined;
  const parsed = row ? Number(row.value) : NaN;
  const port = Number.isFinite(parsed) ? parsed : 8000;

  db.close();
  return port;
}
