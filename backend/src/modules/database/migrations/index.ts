import { baseline } from "./001-baseline";
import { userSkinName } from "./002-user-skin-name";
import { userAccess } from "./003-user-access";
import { metrics } from "./004-metrics";
import { scheduledTasks } from "./005-scheduled-tasks";
import { serverContent } from "./006-server-content";
import { foreignKeys } from "./007-foreign-keys";
import { cleanup } from "./008-cleanup";
import { serverCreator } from "./009-server-creator";
import { notifications } from "./010-notifications";
import { backups } from "./011-backups";
import { serverModpacks } from "./012-server-modpacks";
import { schemaCleanup } from "./013-schema-cleanup";
import { backupProgress } from "./014-backup-progress";
import { assistant } from "./015-assistant";
import { networks } from "./016-networks";
import { auditServers } from "./017-audit-servers";
import { ftpCredentials } from "./018-ftp-credentials";
import { accessLevels } from "./019-access-levels";
import type { Migration } from "./migration.types";

// Only add new steps at the end, never edit released ones
export const MIGRATIONS: Migration[] = [
  { version: 1, name: "baseline-4.0.2", up: baseline },
  { version: 2, name: "user-skin-name", up: userSkinName },
  {
    version: 3,
    name: "user-access",
    up: userAccess,
    touches: [
      "user_permissions",
      "user_server_access",
      "user_sessions",
      "auth_challenges",
      "otp_codes",
      "telegram_users",
      "scheduled_tasks",
    ],
  },
  { version: 4, name: "metrics", up: metrics, touches: ["metrics"] },
  {
    version: 5,
    name: "scheduled-tasks",
    up: scheduledTasks,
    touches: ["scheduled_tasks", "scheduled_task_runs"],
  },
  {
    version: 6,
    name: "server-content",
    up: serverContent,
    touches: ["server_content"],
  },
  {
    version: 7,
    name: "foreign-keys",
    up: foreignKeys,
    touches: ["backups", "extension_kv"],
  },
  { version: 8, name: "cleanup", up: cleanup },
  {
    version: 9,
    name: "server-creator",
    up: serverCreator,
    touches: ["servers"],
  },
  {
    version: 10,
    name: "notifications",
    up: notifications,
    touches: ["notifications", "notification_prefs", "users"],
  },
  {
    version: 11,
    name: "backups",
    up: backups,
    touches: [
      "backups",
      "backup_storages",
      "backup_copies",
      "backup_policies",
      "backup_journal",
    ],
  },
  {
    version: 12,
    name: "server-modpacks",
    up: serverModpacks,
    touches: ["server_modpacks"],
  },
  {
    version: 13,
    name: "schema-cleanup",
    up: schemaCleanup,
    touches: [
      "audit_logs",
      "backups",
      "backup_file_rules",
      "backup_copies",
      "backup_policies",
      "backup_journal",
      "scheduled_task_runs",
      "server_modpacks",
    ],
  },
  {
    version: 14,
    name: "backup-progress",
    up: backupProgress,
    touches: ["backups"],
  },
  {
    version: 15,
    name: "assistant",
    up: assistant,
    touches: [
      "assistant_conversations",
      "assistant_messages",
      "assistant_tool_calls",
    ],
  },
  {
    version: 16,
    name: "networks",
    up: networks,
    touches: ["networks", "network_members"],
  },
  { version: 17, name: "audit-servers", up: auditServers },
  {
    version: 18,
    name: "ftp-credentials",
    up: ftpCredentials,
    touches: ["user_ftp_credentials"],
  },
  {
    version: 19,
    name: "access-levels",
    up: accessLevels,
    touches: [
      "roles",
      "role_grants",
      "role_permissions",
      "user_roles",
      "user_grants",
    ],
  },
];
