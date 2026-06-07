export enum AuditCategory {
  SERVER = "server",
  ACCOUNT = "account",
  AUTH = "auth",
  SETTINGS = "settings",
}

export enum AuditResult {
  SUCCESS = "success",
  FAILED = "failed",
}

export type AuditSource = "panel" | "telegram" | "system";

/** Known audit action identifiers */
export const AuditAction = {
  SERVER_CREATE: "server.create",
  SERVER_DELETE: "server.delete",
  SERVER_START: "server.start",
  SERVER_STOP: "server.stop",
  SERVER_RESTART: "server.restart",
  ACCOUNT_CREATE: "account.create",
  ACCOUNT_UPDATE: "account.update",
  ACCOUNT_DELETE: "account.delete",
  AUTH_LOGIN: "auth.login",
  AUTH_LOGOUT: "auth.logout",
  AUTH_2FA_APPROVE: "auth.2fa_approve",
  AUTH_2FA_DENY: "auth.2fa_deny",
  SETTINGS_UPDATE: "settings.update",
  SERVER_TYPE_INSTALL: "server_type.install",
  SERVER_TYPE_DELETE: "server_type.delete",
  EXTENSION_INSTALL: "extension.install",
  EXTENSION_ENABLE: "extension.enable",
  EXTENSION_DISABLE: "extension.disable",
  EXTENSION_DELETE: "extension.delete",
  BACKUP_CREATE: "backup.create",
  BACKUP_RESTORE: "backup.restore",
  BACKUP_DELETE: "backup.delete",
  FTP_ENABLE: "ftp.enable",
  FTP_DISABLE: "ftp.disable",
  TWOFA_TOTP_ENABLE: "auth.2fa_totp_enable",
  TWOFA_TOTP_DISABLE: "auth.2fa_totp_disable",
  TWOFA_TELEGRAM_ENABLE: "auth.2fa_telegram_enable",
  TWOFA_TELEGRAM_DISABLE: "auth.2fa_telegram_disable",
} as const;

export type AuditActionValue = (typeof AuditAction)[keyof typeof AuditAction];

export interface IAuditLog {
  id: string;
  /** Actor user id; null when the account was deleted or the action was anonymous */
  userId: string | null;
  /** Actor username snapshot — kept even if the account is later removed */
  username: string;
  action: string;
  category: AuditCategory;
  resourceType?: string | null;
  resourceId?: string | null;
  resourceName?: string | null;
  details?: Record<string, unknown> | null;
  result: AuditResult;
  error?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  source: AuditSource;
  createdAt: number;
}

/** Input accepted by AuditLogService.record — ids/timestamps are filled in */
export interface AuditRecordInput {
  userId?: string | null;
  username?: string | null;
  action: string;
  category: AuditCategory;
  resourceType?: string | null;
  resourceId?: string | null;
  resourceName?: string | null;
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
