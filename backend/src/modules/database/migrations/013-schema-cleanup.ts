import type { Database } from "bun:sqlite";
import { count, plural, rebuildTable } from "./migration.types";

type Log = (message: string) => void;

// Removes facts stored twice, moves lists out of JSON columns and adds the
// keys and checks the tables were missing
export function schemaCleanup(db: Database, log: Log): void {
  derivedColumns(db);
  auditLogUsers(db, log);
  backupFileRules(db);
  backupCopies(db, log);
  backupPolicies(db);
  backupJournal(db, log);
  scheduledTaskRuns(db);
  serverModpacks(db);
}

// Each of these follows from another column or was never written
function derivedColumns(db: Database): void {
  // kind decides category and severity
  db.run("ALTER TABLE notifications DROP COLUMN category");
  db.run("ALTER TABLE notifications DROP COLUMN severity");
  // TOTP is on exactly when a secret is stored
  db.run("UPDATE users SET totpSecret = NULL WHERE totpEnabled = 0");
  db.run("ALTER TABLE users DROP COLUMN totpEnabled");
  db.run("ALTER TABLE otp_codes DROP COLUMN telegramId");
  db.run(
    "CREATE UNIQUE INDEX idx_backup_storages_name ON backup_storages (name)",
  );
}

// Entries outlive their author, the username column keeps the name
function auditLogUsers(db: Database, log: Log): void {
  const orphaned = count(
    db,
    "audit_logs",
    "WHERE userId IS NOT NULL AND userId NOT IN (SELECT id FROM users)",
  );
  const columns = `id, userId, username, action, category, resourceType, resourceId,
    resourceName, details, result, error, ip, userAgent, source, createdAt`;
  rebuildTable(db, "audit_logs", {
    define: (name) => `CREATE TABLE ${name} (
      id TEXT PRIMARY KEY,
      userId TEXT REFERENCES users(id) ON DELETE SET NULL,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      category TEXT NOT NULL,
      resourceType TEXT,
      resourceId TEXT,
      resourceName TEXT,
      details TEXT,
      result TEXT NOT NULL CHECK (result IN ('success', 'failed')),
      error TEXT,
      ip TEXT,
      userAgent TEXT,
      source TEXT NOT NULL DEFAULT 'panel',
      createdAt INTEGER NOT NULL
    )`,
    columns,
    select: `SELECT ${columns.replace(
      "userId,",
      "CASE WHEN userId IN (SELECT id FROM users) THEN userId END,",
    )} FROM audit_logs`,
    indexes: [
      "CREATE INDEX idx_audit_logs_created_at ON audit_logs (createdAt DESC)",
      "CREATE INDEX idx_audit_logs_user_id ON audit_logs (userId)",
      "CREATE INDEX idx_audit_logs_action ON audit_logs (action)",
      "CREATE INDEX idx_audit_logs_category ON audit_logs (category)",
    ],
  });
  if (orphaned > 0) {
    log(
      `unlinked ${plural(orphaned, "audit entry", "audit entries")} of deleted accounts`,
    );
  }
}

// Selected files and exclusions become rows instead of JSON arrays
function backupFileRules(db: Database): void {
  db.run(`CREATE TABLE backup_file_rules (
    backupId TEXT NOT NULL REFERENCES backups(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('include', 'exclude')),
    position INTEGER NOT NULL,
    path TEXT NOT NULL,
    PRIMARY KEY (backupId, kind, position)
  )`);

  const insert = db.prepare(
    "INSERT INTO backup_file_rules (backupId, kind, position, path) VALUES (?, ?, ?, ?)",
  );
  const rows = db
    .query("SELECT id, selectedFiles, exclusions FROM backups")
    .all() as {
    id: string;
    selectedFiles: string | null;
    exclusions: string | null;
  }[];
  for (const row of rows) {
    const included = parseList(row.selectedFiles).map((file) =>
      typeof file === "string" ? file : (file as { path?: string })?.path,
    );
    included
      .filter((path): path is string => !!path)
      .forEach((path, i) => insert.run(row.id, "include", i, path));
    parseList(row.exclusions)
      .filter((p): p is string => typeof p === "string")
      .forEach((pattern, i) => insert.run(row.id, "exclude", i, pattern));
  }

  const columns = `id, name, description, type, status, progress, createdAt, updatedAt,
    fileCount, totalSize, serverId, ownerId, format, compressionRatio, pinned, checksum`;
  rebuildTable(db, "backups", {
    define: (name) => `CREATE TABLE ${name} (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK (type IN ('full', 'partial')),
      status TEXT NOT NULL CHECK (status IN ('creating', 'completed', 'failed')),
      progress REAL NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      fileCount INTEGER NOT NULL DEFAULT 0,
      totalSize INTEGER NOT NULL DEFAULT 0,
      serverId TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      ownerId TEXT REFERENCES users(id) ON DELETE SET NULL,
      format TEXT NOT NULL DEFAULT 'zip' CHECK (format IN ('zip', 'tar.gz')),
      compressionRatio INTEGER CHECK (compressionRatio BETWEEN 1 AND 9),
      pinned INTEGER NOT NULL DEFAULT 0,
      checksum TEXT
    )`,
    columns,
    select: `SELECT ${columns.replace(
      "compressionRatio,",
      "CASE WHEN compressionRatio BETWEEN 1 AND 9 THEN compressionRatio END,",
    )} FROM backups`,
    indexes: [
      "CREATE INDEX idx_backups_server_id ON backups (serverId, createdAt DESC)",
      "CREATE INDEX idx_backups_owner_id ON backups (ownerId)",
    ],
  });
}

// One copy per location, and a storage cannot vanish under its copies
function backupCopies(db: Database, log: Log): void {
  const before = count(db, "backup_copies");
  db.run(`DELETE FROM backup_copies WHERE rowid NOT IN (
    SELECT MAX(rowid) FROM backup_copies GROUP BY backupId, IFNULL(storageId, '')
  )`);
  const duplicates = before - count(db, "backup_copies");

  const columns =
    "id, backupId, storageId, objectKey, size, status, error, createdAt, updatedAt";
  rebuildTable(db, "backup_copies", {
    define: (name) => `CREATE TABLE ${name} (
      id TEXT PRIMARY KEY,
      backupId TEXT NOT NULL REFERENCES backups(id) ON DELETE CASCADE,
      storageId TEXT REFERENCES backup_storages(id),
      objectKey TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK (status IN ('uploading', 'ready', 'failed')),
      error TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )`,
    columns,
    select: `SELECT ${columns} FROM backup_copies`,
    indexes: [
      "CREATE UNIQUE INDEX idx_backup_copies_location ON backup_copies (backupId, IFNULL(storageId, ''))",
      "CREATE INDEX idx_backup_copies_storage ON backup_copies (storageId)",
    ],
  });
  if (duplicates > 0) {
    log(
      `dropped ${plural(duplicates, "duplicate backup copy", "duplicate backup copies")}`,
    );
  }
}

function backupPolicies(db: Database): void {
  const columns = `serverId, localKeepCount, localKeepDays, storageId, remoteKeepCount,
    remoteKeepDays, uploadMode, deleteLocalAfterUpload`;
  rebuildTable(db, "backup_policies", {
    define: (name) => `CREATE TABLE ${name} (
      serverId TEXT PRIMARY KEY REFERENCES servers(id) ON DELETE CASCADE,
      localKeepCount INTEGER CHECK (localKeepCount > 0),
      localKeepDays INTEGER CHECK (localKeepDays > 0),
      storageId TEXT REFERENCES backup_storages(id) ON DELETE SET NULL,
      remoteKeepCount INTEGER CHECK (remoteKeepCount > 0),
      remoteKeepDays INTEGER CHECK (remoteKeepDays > 0),
      uploadMode TEXT NOT NULL DEFAULT 'manual' CHECK (uploadMode IN ('auto', 'manual')),
      deleteLocalAfterUpload INTEGER NOT NULL DEFAULT 0
    )`,
    columns,
    select: `SELECT ${columns} FROM backup_policies`,
  });
  db.run(
    "CREATE INDEX idx_backup_policies_storage ON backup_policies (storageId)",
  );
}

// actor mixed user ids with "scheduler" and "system", now a trigger plus a user
function backupJournal(db: Database, log: Log): void {
  const orphaned = count(
    db,
    "backup_journal",
    "WHERE serverId IS NULL OR serverId NOT IN (SELECT id FROM servers)",
  );
  db.run(
    "DELETE FROM backup_journal WHERE serverId IS NULL OR serverId NOT IN (SELECT id FROM servers)",
  );
  rebuildTable(db, "backup_journal", {
    define: (name) => `CREATE TABLE ${name} (
      id TEXT PRIMARY KEY,
      serverId TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      backupId TEXT,
      backupName TEXT,
      storageId TEXT REFERENCES backup_storages(id) ON DELETE SET NULL,
      op TEXT NOT NULL CHECK (op IN ('create', 'upload', 'download', 'restore', 'delete', 'prune', 'recover')),
      status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
      message TEXT,
      bytes INTEGER,
      durationMs INTEGER,
      trigger TEXT NOT NULL CHECK (trigger IN ('user', 'scheduler', 'system')),
      userId TEXT REFERENCES users(id) ON DELETE SET NULL,
      createdAt INTEGER NOT NULL
    )`,
    columns: `id, serverId, backupId, backupName, storageId, op, status, message, bytes,
      durationMs, trigger, userId, createdAt`,
    select: `SELECT id, serverId, backupId, backupName,
      CASE WHEN storageId IN (SELECT id FROM backup_storages) THEN storageId END,
      op, status, message, bytes, durationMs,
      CASE WHEN actor IN ('scheduler', 'system') THEN actor ELSE 'user' END,
      CASE WHEN actor IN (SELECT id FROM users) THEN actor END,
      createdAt
      FROM backup_journal`,
    indexes: [
      "CREATE INDEX idx_backup_journal_server ON backup_journal (serverId, createdAt DESC)",
    ],
  });
  if (orphaned > 0) {
    log(
      `dropped ${plural(orphaned, "journal entry", "journal entries")} of deleted servers`,
    );
  }
}

// The server of a run is the server of its task
function scheduledTaskRuns(db: Database): void {
  const columns =
    "id, taskId, startedAt, finishedAt, durationMs, status, triggeredBy, output, error";
  rebuildTable(db, "scheduled_task_runs", {
    define: (name) => `CREATE TABLE ${name} (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL REFERENCES scheduled_tasks(id) ON DELETE CASCADE,
      startedAt INTEGER NOT NULL,
      finishedAt INTEGER,
      durationMs INTEGER,
      status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
      triggeredBy TEXT NOT NULL CHECK (triggeredBy IN ('cron', 'manual', 'once')),
      output TEXT,
      error TEXT
    )`,
    columns,
    select: `SELECT ${columns} FROM scheduled_task_runs`,
    indexes: [
      "CREATE INDEX idx_task_runs_task_id ON scheduled_task_runs (taskId, startedAt DESC)",
    ],
  });
}

// A Modrinth pack is identified by its project and version
function serverModpacks(db: Database): void {
  const columns =
    "serverId, source, projectId, versionId, name, version, installedAt";
  rebuildTable(db, "server_modpacks", {
    define: (name) => `CREATE TABLE ${name} (
      serverId TEXT PRIMARY KEY REFERENCES servers(id) ON DELETE CASCADE,
      source TEXT NOT NULL CHECK (source IN ('file', 'modrinth')),
      projectId TEXT,
      versionId TEXT,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      installedAt INTEGER NOT NULL,
      CHECK (source = 'file' OR (projectId IS NOT NULL AND versionId IS NOT NULL))
    )`,
    columns,
    select: `SELECT ${columns} FROM server_modpacks`,
  });
}

function parseList(json: string | null): unknown[] {
  if (!json) return [];
  try {
    const value: unknown = JSON.parse(json);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
