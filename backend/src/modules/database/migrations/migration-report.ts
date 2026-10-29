import type { Database } from "bun:sqlite";
import { Branding } from "@/core/constants/branding";
import { getVersion } from "@/core/utils/updates";
import chalk from "chalk";
import * as path from "path";
import { count, tableExists } from "./migration.types";

const INDENT = "       ";

function rows(db: Database, table: string, where = ""): number {
  return tableExists(db, table) ? count(db, table, where) : 0;
}

function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

// Totals after the update, zero rows are hidden
function summarize(db: Database): string[] {
  const users = rows(db, "users");
  const admins = rows(db, "users", "WHERE isAdmin = 1");
  const servers = rows(db, "servers");
  const plugins = rows(db, "server_content", "WHERE kind = 'plugin'");
  const mods = rows(db, "server_content", "WHERE kind = 'mod'");
  const backups = rows(db, "backups");
  const tasks = rows(db, "scheduled_tasks");
  const runs = rows(db, "scheduled_task_runs");
  const sessions = rows(db, "user_sessions");
  const audit = rows(db, "audit_logs");
  const metrics = rows(db, "metrics");
  const extensions = rows(db, "extensions");
  const telegram = rows(db, "telegram_users");

  const lines: [number, string][] = [
    [
      users,
      `${plural(users, "account", "accounts")}${admins ? chalk.gray(` (${admins} admin)`) : ""}`,
    ],
    [servers, plural(servers, "server", "servers")],
    [
      plugins + mods,
      `${plural(plugins, "plugin", "plugins")}, ${plural(mods, "mod", "mods")}`,
    ],
    [backups, plural(backups, "backup", "backups")],
    [
      tasks,
      `${plural(tasks, "scheduled task", "scheduled tasks")}${runs ? chalk.gray(` (${plural(runs, "run", "runs")} in history)`) : ""}`,
    ],
    [telegram, plural(telegram, "Telegram link", "Telegram links")],
    [extensions, plural(extensions, "extension", "extensions")],
    [sessions, plural(sessions, "active session", "active sessions")],
    [audit, plural(audit, "audit log entry", "audit log entries")],
    [metrics, plural(metrics, "metrics sample", "metrics samples")],
  ];

  return lines.filter(([n]) => n > 0).map(([, text]) => text);
}

export function printUpgradeReport(
  db: Database,
  backupPath: string | null,
  cleaned: string[],
  startedAt: number,
): void {
  console.log(" ");
  console.log(
    `    📦 ${chalk.bold(`Database updated for Kubek ${getVersion()}`)}`,
  );
  for (const line of summarize(db)) {
    console.log(`${INDENT}${chalk.green("✔")} ${line}`);
  }

  if (cleaned.length > 0) {
    console.log(`${INDENT}${chalk.gray("Notes:")}`);
    for (const note of cleaned) {
      console.log(`${INDENT}${chalk.gray(`· ${note}`)}`);
    }
  }

  if (backupPath) {
    console.log(
      `${INDENT}${chalk.gray(`Backup of the previous version: ${path.basename(backupPath)}`)}`,
    );
  }
  console.log(`${INDENT}${chalk.gray(`Done in ${Date.now() - startedAt} ms`)}`);
  console.log(" ");
}

export function printUpgradeFailure(
  backupPath: string | null,
  error: unknown,
): void {
  const message = error instanceof Error ? error.message : String(error);
  console.log(" ");
  console.log(`    ❌ ${chalk.bold.red("Database update failed")}`);
  console.log(`${INDENT}${chalk.red(message)}`);
  console.log(
    `${INDENT}${chalk.gray("Nothing was changed, the database is exactly as before the update.")}`,
  );
  if (backupPath) {
    console.log(
      `${INDENT}${chalk.gray(`A copy was also saved to ${path.basename(backupPath)}`)}`,
    );
  }
  console.log(
    `${INDENT}${chalk.gray(`Please report this at ${Branding.GitHub}/issues`)}`,
  );
  console.log(" ");
}
