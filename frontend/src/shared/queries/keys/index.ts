import { aboutKeys } from "./about.keys";
import { accountsKeys } from "./accounts.keys";
import { auditLogKeys } from "./audit-log.keys";
import { authKeys } from "./auth.keys";
import { backupsKeys } from "./backups.keys";
import { configKeys } from "./config.keys";
import { extensionsKeys } from "./extensions.keys";
import { filesKeys } from "./files.keys";
import { javaKeys } from "./java.keys";
import { metricsHistoryKeys } from "./metrics-history.keys";
import { modsKeys } from "./mods.keys";
import { pluginsKeys } from "./plugins.keys";
import { schedulerKeys } from "./scheduler.keys";
import { serverFoldersKeys } from "./server-folders.keys";
import { serverLogsKeys } from "./server-logs.keys";
import { serverTypesKeys } from "./server-types.keys";
import { serversKeys } from "./servers.keys";
import { sessionsKeys } from "./sessions.keys";
import { systemMonitoringKeys } from "./system-monitoring.keys";
import { tasksKeys } from "./tasks.keys";
import { telegramKeys } from "./telegram.keys";
import { twofaKeys } from "./twofa.keys";

export const qk = {
  about: aboutKeys,
  auth: authKeys,
  servers: serversKeys,
  files: filesKeys,
  backups: backupsKeys,
  plugins: pluginsKeys,
  mods: modsKeys,
  serverTypes: serverTypesKeys,
  java: javaKeys,
  accounts: accountsKeys,
  sessions: sessionsKeys,
  tasks: tasksKeys,
  config: configKeys,
  scheduler: schedulerKeys,
  systemMonitoring: systemMonitoringKeys,
  serverFolders: serverFoldersKeys,
  metricsHistory: metricsHistoryKeys,
  serverLogs: serverLogsKeys,
  auditLog: auditLogKeys,
  extensions: extensionsKeys,
  telegram: telegramKeys,
  twofa: twofaKeys,
} as const;

export {
  aboutKeys,
  accountsKeys,
  auditLogKeys,
  authKeys,
  backupsKeys,
  configKeys,
  extensionsKeys,
  filesKeys,
  javaKeys,
  metricsHistoryKeys,
  modsKeys,
  pluginsKeys,
  schedulerKeys,
  serverFoldersKeys,
  serverLogsKeys,
  serversKeys,
  serverTypesKeys,
  sessionsKeys,
  systemMonitoringKeys,
  tasksKeys,
  telegramKeys,
  twofaKeys
};

