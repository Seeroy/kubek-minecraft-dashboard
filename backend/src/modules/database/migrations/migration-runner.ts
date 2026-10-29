import type { Database } from "bun:sqlite";
import { Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { MIGRATIONS } from "./index";
import type { Migration } from "./migration.types";
import { printUpgradeFailure, printUpgradeReport } from "./migration-report";

const BACKUPS_TO_KEEP = 3;

const logger = new Logger("DatabaseMigrations");

// Step by step logs in dev, a short summary for users
const DEV = process.env.NODE_ENV === "development";

export function schemaVersion(db: Database): number {
  const row = db.query("PRAGMA user_version").get() as {
    user_version: number;
  };
  return Number(row.user_version);
}

// Updates the schema to the latest version in one transaction.
// If any step fails nothing is changed
export function runMigrations(db: Database, dbFilePath: string): void {
  const current = schemaVersion(db);
  const latest = MIGRATIONS[MIGRATIONS.length - 1].version;

  if (current > latest) {
    throw new Error(
      `Database schema v${current} is newer than this Kubek build supports (v${latest}). ` +
        `Update Kubek or restore a db.sql backup made before the upgrade`,
    );
  }

  const pending = MIGRATIONS.filter((m) => m.version > current);
  if (pending.length === 0) return;

  const isUpgrade = hasUserTables(db);
  const startedAt = Date.now();
  const backupPath = isUpgrade ? backupDatabase(db, dbFilePath, current) : null;
  const cleaned: string[] = [];
  let failed: Migration | null = null;

  // Has to be set outside the transaction, inside SQLite ignores it
  db.run("PRAGMA foreign_keys = OFF");
  try {
    db.transaction(() => {
      for (const migration of pending) {
        failed = migration;
        migration.up(db, (message) => {
          cleaned.push(message);
          if (DEV) {
            logger.log(`v${migration.version} ${migration.name}: ${message}`);
          }
        });
        assertForeignKeys(db, migration.touches ?? []);
        db.run(`PRAGMA user_version = ${migration.version}`);
        if (DEV) logger.log(`applied v${migration.version} ${migration.name}`);
      }
      failed = null;
    })();
  } catch (error) {
    const step = failed as Migration | null;
    if (DEV) {
      logger.error(
        `Migration v${step?.version} ${step?.name} failed, database left at v${current}` +
          (backupPath ? `. Backup: ${backupPath}` : ""),
      );
    } else {
      printUpgradeFailure(backupPath, error);
    }
    throw error;
  } finally {
    db.run("PRAGMA foreign_keys = ON");
  }

  if (isUpgrade && !DEV) {
    printUpgradeReport(db, backupPath, cleaned, startedAt);
  }
}

// config_kv is created by configEarly before migrations, a fresh db has it too
function hasUserTables(db: Database): boolean {
  return !!db
    .query(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != 'config_kv' LIMIT 1",
    )
    .get();
}

function assertForeignKeys(db: Database, tables: string[]): void {
  for (const table of tables) {
    const violations = db.query(`PRAGMA foreign_key_check(${table})`).all();
    if (violations.length > 0) {
      throw new Error(
        `${table}: ${violations.length} foreign key violations, first: ${JSON.stringify(violations[0])}`,
      );
    }
  }
}

// Copy of the database next to db.sql, keeps the last few
function backupDatabase(
  db: Database,
  dbFilePath: string,
  version: number,
): string {
  const dir = path.dirname(dbFilePath);
  const prefix = `${path.basename(dbFilePath)}.bak-`;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = path.join(dir, `${prefix}v${version}-${stamp}`);

  db.query("VACUUM INTO ?").run(target);
  if (DEV) logger.log(`backup before migrating from v${version}: ${target}`);

  const old = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(prefix))
    .map((f) => path.join(dir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    .slice(BACKUPS_TO_KEEP);
  for (const file of old) {
    try {
      fs.rmSync(file);
    } catch {
      // not a big deal if an old copy stays
    }
  }

  return target;
}
