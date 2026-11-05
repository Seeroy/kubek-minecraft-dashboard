import type { Database } from "bun:sqlite";
import { columnsOf } from "./migration.types";

// Each feed type can be turned off, advancements are gone from the feed
export function companionFeed(db: Database): void {
  const columns = columnsOf(db, "companion_settings");
  for (const column of ["sessions", "kicks", "deaths"]) {
    if (!columns.includes(column)) {
      db.run(
        `ALTER TABLE companion_settings ADD COLUMN ${column} INTEGER NOT NULL DEFAULT 1`,
      );
    }
  }
  db.run("DELETE FROM companion_events WHERE type = 'advancement'");
}
