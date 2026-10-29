import type { Database } from "bun:sqlite";
import { existsSync, statSync } from "fs";
import { basename } from "path";
import { count, plural } from "./migration.types";

// Backups get copies per location (local disk or a remote storage), a per
// server retention policy and a journal. Columns the old code wrote but never
// stored (format, compression, exclusions) are added, the format of existing
// archives is recovered from the file extension
export function backups(db: Database, log: (message: string) => void): void {
  db.run("ALTER TABLE backups ADD COLUMN format TEXT NOT NULL DEFAULT 'zip'");
  db.run("ALTER TABLE backups ADD COLUMN compressionRatio INTEGER");
  db.run("ALTER TABLE backups ADD COLUMN exclusions TEXT");
  db.run("ALTER TABLE backups ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0");
  db.run("ALTER TABLE backups ADD COLUMN checksum TEXT");
  db.run("UPDATE backups SET format = 'tar.gz' WHERE path LIKE '%.tar.gz'");

  db.run(`CREATE TABLE backup_storages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    driver TEXT NOT NULL,
    config TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE backup_copies (
    id TEXT PRIMARY KEY,
    backupId TEXT NOT NULL REFERENCES backups(id) ON DELETE CASCADE,
    storageId TEXT REFERENCES backup_storages(id) ON DELETE CASCADE,
    objectKey TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    error TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`);
  db.run("CREATE INDEX idx_backup_copies_backup ON backup_copies (backupId)");
  db.run("CREATE INDEX idx_backup_copies_storage ON backup_copies (storageId)");

  db.run(`CREATE TABLE backup_policies (
    serverId TEXT PRIMARY KEY REFERENCES servers(id) ON DELETE CASCADE,
    localKeepCount INTEGER,
    localKeepDays INTEGER,
    storageId TEXT REFERENCES backup_storages(id) ON DELETE SET NULL,
    remoteKeepCount INTEGER,
    remoteKeepDays INTEGER,
    uploadMode TEXT NOT NULL DEFAULT 'manual',
    deleteLocalAfterUpload INTEGER NOT NULL DEFAULT 0
  )`);

  db.run(`CREATE TABLE backup_journal (
    id TEXT PRIMARY KEY,
    serverId TEXT,
    backupId TEXT,
    backupName TEXT,
    storageId TEXT,
    op TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    bytes INTEGER,
    durationMs INTEGER,
    actor TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  )`);
  db.run(
    "CREATE INDEX idx_backup_journal_server ON backup_journal (serverId, createdAt DESC)",
  );

  // The archive path becomes the local copy, stored relative to the backups folder
  const archived = db
    .query(
      "SELECT id, path, totalSize, createdAt, updatedAt FROM backups WHERE status = 'completed' AND path IS NOT NULL",
    )
    .all() as {
    id: string;
    path: string;
    totalSize: number;
    createdAt: number;
    updatedAt: number;
  }[];
  const insert = db.prepare(`INSERT INTO backup_copies
    (id, backupId, storageId, objectKey, size, status, createdAt, updatedAt)
    VALUES (?, ?, NULL, ?, ?, 'ready', ?, ?)`);
  for (const row of archived) {
    insert.run(
      crypto.randomUUID(),
      row.id,
      basename(row.path),
      // totalSize is the raw file sum, the copy records the archive size
      existsSync(row.path) ? statSync(row.path).size : row.totalSize,
      row.createdAt,
      row.updatedAt,
    );
  }
  db.run("ALTER TABLE backups DROP COLUMN path");

  const interrupted = count(db, "backups", "WHERE status = 'creating'");
  db.run(
    "UPDATE backups SET status = 'failed' WHERE status IN ('creating', 'paused')",
  );
  if (archived.length > 0) {
    log(
      `moved ${plural(archived.length, "archive", "archives")} to local copies`,
    );
  }
  if (interrupted > 0) {
    log(
      `marked ${plural(interrupted, "interrupted backup", "interrupted backups")} as failed`,
    );
  }
}
