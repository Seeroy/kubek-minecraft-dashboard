export interface IUser {
  id: string;
  username: string;
  password: string;
  secret: string;
  permissions: UserPermissions[];
  serversRestrict: UserServersRestrict;
  isAdmin?: boolean;
  oobeCompleted?: boolean;
  totpSecret?: string | null;
  totpEnabled?: boolean;
  telegram2faEnabled?: boolean;
  twofaPrimary?: TwoFactorMethod | null;
  notifyTaskResults?: boolean;
  /** Serialized dashboard layout (widget visibility + grid positions per breakpoint) */
  dashboardLayout?: string | null;
}

export type TwoFactorMethod = "totp" | "telegram";

export interface UserServersRestrict {
  enabled: boolean;
  allowed: string[];
}

export enum UserPermissions {
  ACCOUNTS_MANAGEMENT = "accounts_mgr",
  FILE_MANAGER = "file_manager",
  SERVERS_VIEW = "servers_view",
  SERVERS_CONTROL = "servers_control",
  SERVERS_CONFIGURE = "servers_configure",
  CREATE_SERVERS = "servers_create",
  MANAGE_JAVA = "java_mgr",
  MANAGE_PLUGINS = "plugins_mgr",
  KUBEK_SETTINGS = "kubek_settings",
  BACKUPS = "backups",
  SYSTEM_MONITORING = "system_monitoring",
  SCHEDULER_MANAGEMENT = "scheduler_mgr",
  AUDIT_LOG = "audit_log",
}
