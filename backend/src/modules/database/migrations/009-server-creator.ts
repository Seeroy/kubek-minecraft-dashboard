import type { Database } from "bun:sqlite";
import { count, plural } from "./migration.types";

// Remembers who created each server. For 4.0.x servers we take it from the
// audit log, 3.x servers have no record and stay NULL. Access rights are not
// touched, only new servers grant access to their creator
export function serverCreator(
  db: Database,
  log: (message: string) => void,
): void {
  db.run(
    "ALTER TABLE servers ADD COLUMN createdBy TEXT REFERENCES users(id) ON DELETE SET NULL",
  );
  db.run("CREATE INDEX idx_servers_created_by ON servers (createdBy)");

  db.run(`UPDATE servers SET createdBy = (
    SELECT a.userId FROM audit_logs a
     WHERE a.action = 'server.create' AND a.result = 'success'
       AND a.resourceId = servers.id
       AND a.userId IN (SELECT id FROM users)
     ORDER BY a.createdAt ASC LIMIT 1
  )`);

  const unknown = count(db, "servers", "WHERE createdBy IS NULL");
  if (unknown > 0) {
    log(
      `creator unknown for ${plural(unknown, "server", "servers")} (made before 4.0 or by a deleted account)`,
    );
  }
}
