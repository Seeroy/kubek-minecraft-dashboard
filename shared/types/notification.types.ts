export enum NotificationCategory {
  TASKS = "tasks",
  SERVERS = "servers",
  BACKUPS = "backups",
  SECURITY = "security",
  SYSTEM = "system",
  CONTENT = "content",
}

export enum NotificationChannel {
  INBOX = "inbox",
  TELEGRAM = "telegram",
}

export type NotificationSeverity = "info" | "success" | "warning" | "error";

/** Params of every notification kind, the text is rendered by the client in its language */
export interface NotificationParamsMap {
  "task.succeeded": TaskNotificationParams;
  "task.failed": TaskNotificationParams;
  "task.cancelled": TaskNotificationParams;
  "server.status": { serverId: string; serverName: string; status: string };
  "server.crashed": { serverId: string; serverName: string };
  "server.error": { serverId: string; serverName: string; errorType: string };
  "server.low_tps": { serverId: string; serverName: string; tps: number };
  "auth.login": { userId: string; username: string; ip: string | null };
  "backup.failed": {
    serverId: string;
    serverName: string;
    /** Lets the Telegram alert offer a retry, null when the journal had none */
    backupId: string | null;
    backupName: string;
    op: string;
    error: string | null;
  };
  "auth.locked": { ip: string | null; reason: string; retryAfterSec: number };
  "storage.unreachable": {
    storageId: string;
    storageName: string;
    error: string;
  };
  "panel.update_available": { version: string; currentVersion: string; url: string };
  "content.updates_available": ContentUpdatesParams;
}

export interface ContentUpdatesParams {
  serverId: string;
  serverName: string;
  kind: "plugins" | "mods";
  /** Every pending update, not only the new ones */
  count: number;
  /** A few titles to show, the rest is count minus these */
  names: string[];
}

export interface TaskNotificationParams {
  taskType: string;
  durationMs: number;
  serverId?: string;
  serverName?: string;
  pluginName?: string;
  error?: string;
  /** Extension tasks have no fixed label, the title comes with them */
  title?: string;
}

export type NotificationKind = keyof NotificationParamsMap;

export interface INotification<K extends NotificationKind = NotificationKind> {
  id: string;
  userId: string;
  kind: K;
  category: NotificationCategory;
  severity: NotificationSeverity;
  params: NotificationParamsMap[K];
  readAt: number | null;
  createdAt: number;
}

export interface NotificationsPage {
  items: INotification[];
  nextCursor: string | null;
  unreadCount: number;
}

export type NotificationPrefs = Record<
  NotificationCategory,
  Record<NotificationChannel, boolean>
>;

export interface NotificationKindSpec {
  category: NotificationCategory;
  severity: NotificationSeverity;
  /** Routine events are only pushed to chats, the inbox keeps what needs attention */
  inbox: boolean;
}

/** Every kind belongs to one category and has a fixed severity */
export const NOTIFICATION_KINDS: Record<NotificationKind, NotificationKindSpec> = {
  "task.succeeded": {
    category: NotificationCategory.TASKS,
    severity: "success",
    inbox: false,
  },
  "task.failed": {
    category: NotificationCategory.TASKS,
    severity: "error",
    inbox: true,
  },
  "task.cancelled": {
    category: NotificationCategory.TASKS,
    severity: "warning",
    inbox: false,
  },
  "server.status": {
    category: NotificationCategory.SERVERS,
    severity: "info",
    inbox: false,
  },
  "server.crashed": {
    category: NotificationCategory.SERVERS,
    severity: "error",
    inbox: true,
  },
  "server.low_tps": {
    category: NotificationCategory.SERVERS,
    severity: "warning",
    inbox: true,
  },
  "server.error": {
    category: NotificationCategory.SERVERS,
    severity: "warning",
    inbox: true,
  },
  "backup.failed": {
    category: NotificationCategory.BACKUPS,
    severity: "error",
    inbox: true,
  },
  "storage.unreachable": {
    category: NotificationCategory.BACKUPS,
    severity: "error",
    inbox: true,
  },
  "auth.login": {
    category: NotificationCategory.SECURITY,
    severity: "info",
    inbox: false,
  },
  "auth.locked": {
    category: NotificationCategory.SECURITY,
    severity: "warning",
    inbox: true,
  },
  "panel.update_available": {
    category: NotificationCategory.SYSTEM,
    severity: "info",
    inbox: true,
  },
  "content.updates_available": {
    category: NotificationCategory.CONTENT,
    severity: "info",
    inbox: true,
  },
};
