import { NotificationCategory, NotificationChannel, type INotification, type NotificationPrefs } from "@shared/types/notification.types";

export const SAMPLE_NOTIFICATIONS: INotification[] = [
  { id: "sample-1", userId: "sample", kind: "server.crashed", category: NotificationCategory.SERVERS, severity: "error", params: { serverId: "sample", serverName: "Survival" }, readAt: null, createdAt: 0 },
  { id: "sample-2", userId: "sample", kind: "server.low_tps", category: NotificationCategory.SERVERS, severity: "warning", params: { serverId: "sample", serverName: "Creative", tps: 14 }, readAt: null, createdAt: 0 },
  { id: "sample-3", userId: "sample", kind: "auth.login", category: NotificationCategory.SECURITY, severity: "info", params: { userId: "sample", username: "sample-admin", ip: "192.168.0.10" }, readAt: 0, createdAt: 0 },
];

const on = { [NotificationChannel.INBOX]: true, [NotificationChannel.TELEGRAM]: false };

export const SAMPLE_PREFS = Object.fromEntries(Object.values(NotificationCategory).map((category) => [category, on])) as NotificationPrefs;
