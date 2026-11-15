import type { Database } from "bun:sqlite";
import { columnsOf } from "./migration.types";

// Files sent with a message, and the thinking and web sources of an answer
export function assistantAttachments(db: Database): void {
  db.run(`CREATE TABLE IF NOT EXISTS assistant_attachments (
    id TEXT PRIMARY KEY,
    messageId TEXT NOT NULL REFERENCES assistant_messages(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('image', 'text')),
    name TEXT NOT NULL,
    mime TEXT NOT NULL,
    data BLOB NOT NULL
  )`);
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_assistant_attachments_message ON assistant_attachments (messageId, position)",
  );

  // replay holds the provider's own reasoning fields, some must get them back
  const columns = columnsOf(db, "assistant_messages");
  const added: [string, string][] = [
    ["reasoning", "TEXT"],
    ["reasoningMs", "INTEGER"],
    ["replay", "TEXT"],
    ["sources", "TEXT"],
  ];
  for (const [column, type] of added) {
    if (!columns.includes(column)) {
      db.run(`ALTER TABLE assistant_messages ADD COLUMN ${column} ${type}`);
    }
  }
}
