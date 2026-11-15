import type { Database } from "bun:sqlite";
import { columnsOf } from "./migration.types";

// Prompt tokens the provider served from its cache, they are billed cheaper
export function assistantCachedTokens(db: Database): void {
  if (!columnsOf(db, "assistant_messages").includes("cachedTokens")) {
    db.run("ALTER TABLE assistant_messages ADD COLUMN cachedTokens INTEGER");
  }
}
