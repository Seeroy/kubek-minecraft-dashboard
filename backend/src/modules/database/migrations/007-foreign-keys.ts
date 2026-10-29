import type { Database } from "bun:sqlite";
import { count, plural, rebuildTable } from "./migration.types";

// Foreign keys for backups.ownerId and extension_kv.extId.
// extensions.version goes away, the manifest has it
export function foreignKeys(
  db: Database,
  log: (message: string) => void,
): void {
  const orphanOwners = count(
    db,
    "backups",
    "WHERE ownerId IS NOT NULL AND ownerId NOT IN (SELECT id FROM users)",
  );
  if (orphanOwners > 0) {
    log(
      `unlinked ${plural(orphanOwners, "backup", "backups")} from deleted accounts`,
    );
  }

  rebuildTable(db, "backups", {
    define: (name) => `CREATE TABLE ${name} (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      progress REAL NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      fileCount INTEGER NOT NULL DEFAULT 0,
      totalSize INTEGER NOT NULL DEFAULT 0,
      selectedFiles TEXT,
      serverId TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      path TEXT,
      ownerId TEXT REFERENCES users(id) ON DELETE SET NULL
    )`,
    columns: `id, name, description, type, status, progress, createdAt, updatedAt,
      fileCount, totalSize, selectedFiles, serverId, path, ownerId`,
    select: `SELECT id, name, description, type, status, progress, createdAt, updatedAt,
      fileCount, totalSize, selectedFiles, serverId, path,
      CASE WHEN ownerId IN (SELECT id FROM users) THEN ownerId ELSE NULL END
      FROM backups`,
    indexes: [
      "CREATE INDEX idx_backups_server_id ON backups (serverId)",
      "CREATE INDEX idx_backups_created_at ON backups (createdAt DESC)",
      "CREATE INDEX idx_backups_owner_id ON backups (ownerId)",
    ],
  });

  // Keys of extensions that are already uninstalled
  const orphanKeys = count(
    db,
    "extension_kv",
    "WHERE extId NOT IN (SELECT id FROM extensions)",
  );
  if (orphanKeys > 0) {
    log(
      `removed ${plural(orphanKeys, "storage key", "storage keys")} of uninstalled extensions`,
    );
  }

  db.run(`CREATE TABLE extension_kv_new (
    extId TEXT NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT,
    PRIMARY KEY (extId, key)
  )`);
  db.run(`INSERT INTO extension_kv_new (extId, key, value)
    SELECT extId, key, value FROM extension_kv
     WHERE extId IN (SELECT id FROM extensions)`);
  db.run("DROP TABLE extension_kv");
  db.run("ALTER TABLE extension_kv_new RENAME TO extension_kv");

  db.run("ALTER TABLE extensions DROP COLUMN version");
}
