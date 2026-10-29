import type { Database } from "bun:sqlite";

// Progress belongs to the running task, the row only ever held 0 or 100
export function backupProgress(db: Database): void {
  db.run("ALTER TABLE backups DROP COLUMN progress");
}
