import { accountsApi } from "./accounts/accounts.api";
import { auditLogApi } from "./audit-log/audit-log.api";
import { authApi } from "./auth/auth.api";
import { backupsApi } from "./backups/backups.api";
import { extensionsApi } from "./extensions/extensions.api";
import { filesApi } from "./files/files.api";
import { javaApi } from "./java/java.api";
import { kubekApi } from "./kubek/kubek.api";
import { modsApi, pluginsApi } from "./plugins/plugins.api";
import { schedulerApi } from "./scheduler/scheduler.api";
import { serverFoldersApi } from "./server-folders/server-folders.api";
import { serverTypesApi } from "./server-types/server-types.api";
import { serversApi } from "./servers/servers.api";
import { sessionsApi } from "./sessions/sessions.api";
import { systemMonitoringApi } from "./system-monitoring/system-monitoring.api";
import { tasksApi } from "./tasks/tasks.api";
import { telegramBotApi } from "./telegram-bot/telegram-bot.api";
import { twofaApi } from "./twofa/twofa.api";

export const api = {
  auth: authApi,
  accounts: accountsApi,
  kubek: kubekApi,
  java: javaApi,
  tasks: tasksApi,
  servers: serversApi,
  serverFolders: serverFoldersApi,
  serverTypes: serverTypesApi,
  files: filesApi,
  telegramBot: telegramBotApi,
  backups: backupsApi,
  sessions: sessionsApi,
  twofa: twofaApi,
  plugins: pluginsApi,
  mods: modsApi,
  scheduler: schedulerApi,
  systemMonitoring: systemMonitoringApi,
  auditLog: auditLogApi,
  extensions: extensionsApi,
};

export type Api = typeof api;

export default api;

// Per-resource clients, models and helpers
export * from "./accounts";
export * from "./audit-log";
export * from "./auth";
export * from "./backups";
export * from "./extensions";
export * from "./files";
export * from "./java";
export * from "./kubek";
export * from "./plugins";
export * from "./scheduler";
export * from "./server-folders";
export * from "./server-types";
export * from "./servers";
export * from "./sessions";
export * from "./system-monitoring";
export * from "./tasks";
export * from "./telegram-bot";
export * from "./twofa";

