import { Injectable, OnModuleInit } from "@nestjs/common";
import { Database } from "bun:sqlite";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class SqliteProvider implements OnModuleInit {
  private db!: Database;
  private readonly dbFilePath: string;

  constructor() {
    this.dbFilePath = path.join(process.cwd(), "db.sql");
  }

  onModuleInit(): void {
    this.ensureDatabaseFile();
    this.openDatabase();
    this.runMigrations();
  }

  get connection() {
    if (!this.db) throw new Error("SQLite not initialized");
    return this.db;
  }

  private ensureDatabaseFile() {
    if (!fs.existsSync(this.dbFilePath)) {
      fs.writeFileSync(this.dbFilePath, "");
    }
  }

  private openDatabase() {
    try {
      this.db = new Database(this.dbFilePath, { create: true, strict: true });
      this.db.run("PRAGMA foreign_keys = ON;");
    } catch (e) {
      // Don't continue with an undefined connection
      throw new Error(
        `Failed to open SQLite database at ${this.dbFilePath}: ${(e as Error).message}`,
      );
    }
  }

  private runMigrations() {
    // Legacy configuration table (kept for backward compatibility and one-time migration)
    this.db.run(`CREATE TABLE IF NOT EXISTS configuration (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      eulaAccepted INTEGER NOT NULL,
      authorization INTEGER NOT NULL,
      port INTEGER NOT NULL,
      configVersion INTEGER NOT NULL,
      ftpd TEXT NOT NULL,
      subnetsAccessRestriction TEXT NOT NULL,
      telegramBot TEXT NOT NULL,
      extras TEXT NOT NULL DEFAULT '{}'
    );`);

    // New key-value configuration storage
    this.db.run(`CREATE TABLE IF NOT EXISTS config_kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );`);

    // Ensure minimal defaults in KV store
    this.db.run(`INSERT OR IGNORE INTO config_kv (key, value) VALUES
      ('port', '8000'),
      ('configVersion', '1'),
      ('eulaAccepted', '0'),
      ('authorization', '0'),
      ('ftpd', '{"enabled": false}'),
      ('subnetsAccessRestriction', '{"enabled": false}'),
      ('telegramBot', '{"enabled": false}')
    ;`);

    this.db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      secret TEXT NOT NULL,
      permissions TEXT NOT NULL,
      serversRestrictEnabled INTEGER NOT NULL,
      serversRestrictAllowed TEXT NOT NULL,
      isAdmin INTEGER,
      oobeCompleted INTEGER NOT NULL DEFAULT 0,
      totpSecret TEXT,
      totpEnabled INTEGER NOT NULL DEFAULT 0,
      telegram2faEnabled INTEGER NOT NULL DEFAULT 0,
      twofaPrimary TEXT,
      notifyTaskResults INTEGER NOT NULL DEFAULT 0,
      dashboardLayout TEXT,
      lastSeenWhatsNewVersion TEXT
    );`);

    // Backfill newer user columns on databases created before they existed
    const userColumns = this.db.query(`PRAGMA table_info(users)`).all() as {
      name: string;
    }[];
    const hasUserColumn = (name: string) =>
      userColumns.some((c) => c.name === name);
    if (!hasUserColumn("lastSeenWhatsNewVersion"))
      this.db.run(`ALTER TABLE users ADD COLUMN lastSeenWhatsNewVersion TEXT`);

    // Auth challenges (2FA pending verifications)
    this.db.run(`CREATE TABLE IF NOT EXISTS auth_challenges (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      method TEXT NOT NULL,
      status TEXT NOT NULL,
      tgChatId INTEGER,
      tgMessageId INTEGER,
      ip TEXT,
      userAgent TEXT,
      issuedToken TEXT,
      createdAt INTEGER NOT NULL,
      expiresAt INTEGER NOT NULL,
      resolvedAt INTEGER,
      attempts INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );`);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_auth_challenges_user_id
      ON auth_challenges (userId);`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_auth_challenges_expires_at
      ON auth_challenges (expiresAt);`);

    // Server folders (must be defined before servers ALTER references it)
    this.db.run(`CREATE TABLE IF NOT EXISTS server_folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL
    );`);

    this.db.run(`CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      restartEnabled INTEGER NOT NULL,
      restartAttempts INTEGER NOT NULL,
      folderId TEXT REFERENCES server_folders(id) ON DELETE SET NULL,
      blueprintId TEXT NOT NULL,
      blueprintVersion TEXT,
      variables TEXT NOT NULL DEFAULT '{}',
      runtimeKind TEXT
    );`);

    this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_servers_folder_id ON servers (folderId);`,
    );

    const serverColumns = this.db.query(`PRAGMA table_info(servers)`).all() as {
      name: string;
    }[];
    const hasServerColumn = (name: string) =>
      serverColumns.some((c) => c.name === name);

    // Drop the legacy instance fields now that behavior is blueprint-only
    for (const legacy of [
      "type",
      "core",
      "stopCommand",
      "java",
      "startupArguments",
    ]) {
      if (hasServerColumn(legacy))
        this.db.run(`ALTER TABLE servers DROP COLUMN ${legacy}`);
    }

    this.db.run(`CREATE TABLE IF NOT EXISTS server_plugins (
      id TEXT PRIMARY KEY,
      serverId TEXT NOT NULL,
      projectId TEXT NOT NULL,
      versionId TEXT NOT NULL,
      fileName TEXT NOT NULL,
      fileHash TEXT,
      dependencyOf TEXT,
      installedAt INTEGER NOT NULL,
      updatedAt INTEGER,
      FOREIGN KEY (serverId) REFERENCES servers(id) ON DELETE CASCADE,
      FOREIGN KEY (dependencyOf) REFERENCES server_plugins(id) ON DELETE SET NULL
    );`);

    this.db
      .run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_server_plugins_server_project
      ON server_plugins (serverId, projectId);`);

    this.db.run(`CREATE TABLE IF NOT EXISTS server_mods (
      id TEXT PRIMARY KEY,
      serverId TEXT NOT NULL,
      projectId TEXT NOT NULL,
      versionId TEXT NOT NULL,
      fileName TEXT NOT NULL,
      fileHash TEXT,
      dependencyOf TEXT,
      installedAt INTEGER NOT NULL,
      updatedAt INTEGER,
      FOREIGN KEY (serverId) REFERENCES servers(id) ON DELETE CASCADE,
      FOREIGN KEY (dependencyOf) REFERENCES server_mods(id) ON DELETE SET NULL
    );`);

    this.db
      .run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_server_mods_server_project
      ON server_mods (serverId, projectId);`);

    // Telegram bot tables
    this.db.run(`CREATE TABLE IF NOT EXISTS telegram_users (
      id INTEGER PRIMARY KEY,
      userId TEXT NOT NULL,
      username TEXT,
      firstName TEXT,
      lastName TEXT,
      linkedAt INTEGER NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1,
      language TEXT,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );`);

    this.db.run(`CREATE TABLE IF NOT EXISTS otp_codes (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      codeHash TEXT NOT NULL,
      telegramId INTEGER,
      createdAt INTEGER NOT NULL,
      expiresAt INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );`);

    this.db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_users_user_id
      ON telegram_users (userId);`);

    this.db
      .run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_users_telegram_id
      ON telegram_users (id);`);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_otp_codes_user_id
      ON otp_codes (userId);`);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at
      ON otp_codes (expiresAt);`);

    // Backups table
    this.db.run(`CREATE TABLE IF NOT EXISTS backups (
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
      serverId TEXT NOT NULL,
      path TEXT,
      ownerId TEXT,
      FOREIGN KEY (serverId) REFERENCES servers(id) ON DELETE CASCADE
    );`);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_backups_server_id
      ON backups (serverId);`);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_backups_created_at
      ON backups (createdAt DESC);`);

    this.db.run(`CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      tokenHash TEXT NOT NULL UNIQUE,
      ip TEXT,
      userAgent TEXT,
      createdAt INTEGER NOT NULL,
      lastSeenAt INTEGER NOT NULL,
      expiresAt INTEGER,
      revokedAt INTEGER,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );`);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
      ON user_sessions (userId);`);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at
      ON user_sessions (expiresAt);`);

    // Scheduled tasks
    this.db.run(`CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id TEXT PRIMARY KEY,
      serverId TEXT NOT NULL,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      mode TEXT NOT NULL,
      cronExpression TEXT,
      runAt INTEGER,
      timezone TEXT,
      schedulePayload TEXT NOT NULL,
      action TEXT NOT NULL,
      actionPayload TEXT NOT NULL,
      ownerId TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      lastRunAt INTEGER,
      lastRunStatus TEXT,
      lastRunError TEXT,
      FOREIGN KEY (serverId) REFERENCES servers(id) ON DELETE CASCADE,
      FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE
    );`);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_server_id
      ON scheduled_tasks (serverId);`);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_enabled
      ON scheduled_tasks (enabled);`);

    this.db.run(`CREATE TABLE IF NOT EXISTS scheduled_task_runs (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      serverId TEXT NOT NULL,
      startedAt INTEGER NOT NULL,
      finishedAt INTEGER,
      durationMs INTEGER,
      status TEXT NOT NULL,
      triggeredBy TEXT NOT NULL,
      output TEXT,
      error TEXT,
      FOREIGN KEY (taskId) REFERENCES scheduled_tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (serverId) REFERENCES servers(id) ON DELETE CASCADE
    );`);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_task_runs_task_id
      ON scheduled_task_runs (taskId, startedAt DESC);`);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_task_runs_server_id
      ON scheduled_task_runs (serverId, startedAt DESC);`);

    // Audit logs (user/system action history). No FK to users: the username is
    // snapshotted so records survive account deletion
    this.db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      userId TEXT,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      category TEXT NOT NULL,
      resourceType TEXT,
      resourceId TEXT,
      resourceName TEXT,
      details TEXT,
      result TEXT NOT NULL,
      error TEXT,
      ip TEXT,
      userAgent TEXT,
      source TEXT NOT NULL DEFAULT 'panel',
      createdAt INTEGER NOT NULL
    );`);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
      ON audit_logs (createdAt DESC);`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
      ON audit_logs (userId);`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action
      ON audit_logs (action);`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_category
      ON audit_logs (category);`);

    // Metrics history (adaptive buckets): raw -> 1h retention, 1m -> 6h, 5m -> 24h
    this.db.run(`CREATE TABLE IF NOT EXISTS metrics_raw (
      ts INTEGER NOT NULL,
      scope TEXT NOT NULL,
      cpu REAL NOT NULL,
      ram_used INTEGER NOT NULL,
      ram_total INTEGER NOT NULL,
      PRIMARY KEY (scope, ts)
    );`);
    this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_metrics_raw_ts ON metrics_raw (ts);`,
    );

    this.db.run(`CREATE TABLE IF NOT EXISTS metrics_1m (
      ts INTEGER NOT NULL,
      scope TEXT NOT NULL,
      cpu_avg REAL NOT NULL,
      cpu_max REAL NOT NULL,
      ram_avg INTEGER NOT NULL,
      ram_max INTEGER NOT NULL,
      ram_total INTEGER NOT NULL,
      PRIMARY KEY (scope, ts)
    );`);
    this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_metrics_1m_ts ON metrics_1m (ts);`,
    );

    this.db.run(`CREATE TABLE IF NOT EXISTS metrics_5m (
      ts INTEGER NOT NULL,
      scope TEXT NOT NULL,
      cpu_avg REAL NOT NULL,
      cpu_max REAL NOT NULL,
      ram_avg INTEGER NOT NULL,
      ram_max INTEGER NOT NULL,
      ram_total INTEGER NOT NULL,
      PRIMARY KEY (scope, ts)
    );`);
    this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_metrics_5m_ts ON metrics_5m (ts);`,
    );

    // Extensions (Track A): installed extension records + their key-value store
    this.db.run(`CREATE TABLE IF NOT EXISTS extensions (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      manifest TEXT NOT NULL,
      grantedCapabilities TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'installed',
      installedAt INTEGER NOT NULL,
      updatedAt INTEGER
    );`);
    this.db.run(`CREATE TABLE IF NOT EXISTS extension_kv (
      extId TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT,
      PRIMARY KEY (extId, key)
    );`);
  }
}
