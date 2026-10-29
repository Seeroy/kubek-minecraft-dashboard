import type { Database } from "bun:sqlite";
import { columnsOf } from "./migration.types";

// Dev databases already have this column
export function userSkinName(db: Database): void {
  if (!columnsOf(db, "users").includes("skinName")) {
    db.run("ALTER TABLE users ADD COLUMN skinName TEXT");
  }
}
