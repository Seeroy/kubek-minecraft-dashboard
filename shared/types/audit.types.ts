export enum AuditCategory {
  SERVER = "server",
  ACCOUNT = "account",
  AUTH = "auth",
  SETTINGS = "settings",
  TELEGRAM = "telegram",
  ROLES = "roles",
}

export enum AuditResult {
  SUCCESS = "success",
  FAILED = "failed",
}

export const AUDIT_SOURCES = [
  "panel",
  "telegram",
  "system",
  "assistant",
] as const;

export type AuditSource = (typeof AUDIT_SOURCES)[number];

/** Known audit action identifiers */
export const AuditAction = {
  SERVER_CREATE: "server.create",
  SERVER_DELETE: "server.delete",
  SERVER_START: "server.start",
  SERVER_STOP: "server.stop",
  SERVER_RESTART: "server.restart",
  SERVER_CHANGE_CORE: "server.change_core",
  SERVER_KILL: "server.kill",
  SERVER_DUPLICATE: "server.duplicate",
  SERVER_IMPORT: "server.import",
  SERVER_BULK_DELETE: "server.bulk_delete",
  SERVER_SETTINGS_UPDATE: "server.settings_update",
  SERVER_ICON_UPDATE: "server.icon_update",
  ACCOUNT_CREATE: "account.create",
  ACCOUNT_UPDATE: "account.update",
  ACCOUNT_DELETE: "account.delete",
  ACCOUNT_PASSWORD_CHANGE: "account.password_change",
  ACCOUNT_FTP_PASSWORD_SET: "account.ftp_password_set",
  ACCOUNT_FTP_PASSWORD_REMOVE: "account.ftp_password_remove",
  ACCOUNT_ACCESS_CHANGE: "account.access_change",
  ROLE_CREATE: "role.create",
  ROLE_UPDATE: "role.update",
  ROLE_DELETE: "role.delete",
  AUTH_LOGIN: "auth.login",
  AUTH_LOGOUT: "auth.logout",
  AUTH_2FA_APPROVE: "auth.2fa_approve",
  AUTH_LOCKED: "auth.locked",
  AUTH_2FA_DENY: "auth.2fa_deny",
  AUTH_SESSION_REVOKE: "auth.session_revoke",
  AUTH_SESSIONS_REVOKE_ALL: "auth.sessions_revoke_all",
  SETTINGS_UPDATE: "settings.update",
  SETTINGS_SECRET_VIEW: "settings.secret_view",
  SERVER_TYPE_INSTALL: "server_type.install",
  SERVER_TYPE_DELETE: "server_type.delete",
  EXTENSION_INSTALL: "extension.install",
  EXTENSION_CONSENT: "extension.consent",
  EXTENSION_ENABLE: "extension.enable",
  EXTENSION_DISABLE: "extension.disable",
  EXTENSION_DELETE: "extension.delete",
  BACKUP_CREATE: "backup.create",
  BACKUP_RESTORE: "backup.restore",
  BACKUP_DELETE: "backup.delete",
  BACKUP_UPLOAD: "backup.upload",
  BACKUP_PIN: "backup.pin",
  BACKUP_STORAGE_SAVE: "backup.storage_save",
  BACKUP_STORAGE_DELETE: "backup.storage_delete",
  BACKUP_ORPHANS_DELETE: "backup.orphans_delete",
  BACKUP_POLICY_UPDATE: "backup.policy_update",
  FTP_ENABLE: "ftp.enable",
  FTP_DISABLE: "ftp.disable",
  TWOFA_TOTP_ENABLE: "auth.2fa_totp_enable",
  TWOFA_TOTP_DISABLE: "auth.2fa_totp_disable",
  TWOFA_TELEGRAM_ENABLE: "auth.2fa_telegram_enable",
  TWOFA_TELEGRAM_DISABLE: "auth.2fa_telegram_disable",
  TELEGRAM_BOT_CONFIGURE: "telegram.bot_configure",
  TELEGRAM_OTP_GENERATE: "telegram.otp_generate",
  TELEGRAM_LINK: "telegram.link",
  TELEGRAM_UNLINK: "telegram.unlink",
  PLAYERS_WHITELIST_ADD: "players.whitelist_add",
  PLAYERS_WHITELIST_REMOVE: "players.whitelist_remove",
  PLAYERS_OP: "players.op",
  PLAYERS_DEOP: "players.deop",
  PLAYERS_BAN: "players.ban",
  PLAYERS_PARDON: "players.pardon",
  PLAYERS_BAN_IP: "players.ban_ip",
  PLAYERS_PARDON_IP: "players.pardon_ip",
  PLAYERS_KICK: "players.kick",
  PLAYERS_SETTINGS_UPDATE: "players.settings_update",
  SERVER_COMMAND: "server.command",
  SERVER_PROPERTIES_UPDATE: "server.properties_update",
  FILE_WRITE: "file.write",
  FILE_UPLOAD: "file.upload",
  FILE_CREATE_DIRECTORY: "file.create_directory",
  FILE_RENAME: "file.rename",
  FILE_DELETE: "file.delete",
  FILE_EXTRACT: "file.extract",
  FILE_ARCHIVE: "file.archive",
  CONTENT_INSTALL: "content.install",
  CONTENT_UPDATE: "content.update",
  CONTENT_REMOVE: "content.remove",
  SCHEDULED_TASK_CREATE: "scheduled_task.create",
  SCHEDULED_TASK_UPDATE: "scheduled_task.update",
  SCHEDULED_TASK_DELETE: "scheduled_task.delete",
  SCHEDULED_TASK_TOGGLE: "scheduled_task.toggle",
  SCHEDULED_TASK_RUN: "scheduled_task.run",
  JAVA_INSTALL: "java.install",
  JAVA_DELETE: "java.delete",
  JAVA_CUSTOM_ADD: "java.custom_add",
  JAVA_CUSTOM_REMOVE: "java.custom_remove",
  ASSISTANT_TOOL: "assistant.tool",
  NETWORK_CREATE: "network.create",
  NETWORK_DELETE: "network.delete",
  NETWORK_MEMBER_ADD: "network.member_add",
  NETWORK_MEMBER_REMOVE: "network.member_remove",
  NETWORK_ORDER_UPDATE: "network.order_update",
  NETWORK_SECRET_ROTATE: "network.secret_rotate",
  AUDIT_RETENTION_UPDATE: "audit.retention_update",
  AUDIT_PRUNE: "audit.prune",
} as const;

/**
 * One changed field, a dotted path into the edited object. Secrets only say
 * that they changed, label is a display name known at record time
 */
export interface AuditChange {
  field: string;
  from?: unknown;
  to?: unknown;
  secret?: boolean;
  label?: string;
}

export type AuditActionValue = (typeof AuditAction)[keyof typeof AuditAction];

export interface IAuditLog {
  id: string;
  /** Actor user id; null when the account was deleted or the action was anonymous */
  userId: string | null;
  /** Actor username snapshot, kept even if the account is later removed */
  username: string;
  action: string;
  category: AuditCategory;
  resourceType?: string | null;
  resourceId?: string | null;
  resourceName?: string | null;
  /** Server the action touched, the name is a snapshot */
  serverId?: string | null;
  serverName?: string | null;
  changes?: AuditChange[] | null;
  details?: Record<string, unknown> | null;
  result: AuditResult;
  error?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  source: AuditSource;
  createdAt: number;
}

/** Input accepted by AuditLogService.record, ids and timestamps are filled in */
export interface AuditRecordInput {
  userId?: string | null;
  username?: string | null;
  action: string;
  category: AuditCategory;
  resourceType?: string | null;
  resourceId?: string | null;
  resourceName?: string | null;
  serverId?: string | null;
  serverName?: string | null;
  changes?: AuditChange[] | null;
  details?: Record<string, unknown> | null;
  result?: AuditResult;
  error?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  source?: AuditSource;
}

export interface AuditLogQuery {
  category?: AuditCategory;
  action?: string;
  userId?: string;
  serverId?: string;
  result?: AuditResult;
  search?: string;
  /** Inclusive createdAt range (ms epoch) */
  from?: number;
  to?: number;
  limit?: number;
  offset?: number;
}

export interface AuditLogPage {
  items: IAuditLog[];
  total: number;
  limit: number;
  offset: number;
}

/** How long the audit log keeps entries, null lifts that limit */
export interface AuditRetention {
  keepDays: number | null;
  maxEntries: number | null;
}

export interface AuditRetentionState {
  retention: AuditRetention;
  /** Entries in the log right now */
  total: number;
  oldestAt: number | null;
}
