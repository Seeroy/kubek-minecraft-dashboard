import type { Database } from "bun:sqlite";
import { columnsOf } from "./migration.types";

// Tokens and cost of the model request behind each assistant message
export function assistantUsage(db: Database): void {
  const columns = columnsOf(db, "assistant_messages");
  const added: [string, string][] = [
    ["promptTokens", "INTEGER"],
    ["completionTokens", "INTEGER"],
    ["costUsd", "REAL"],
  ];
  for (const [column, type] of added) {
    if (!columns.includes(column)) {
      db.run(`ALTER TABLE assistant_messages ADD COLUMN ${column} ${type}`);
    }
  }
}
