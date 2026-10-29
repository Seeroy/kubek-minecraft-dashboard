export const notificationsKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationsKeys.all, "list"] as const,
  list: (unread: boolean) => [...notificationsKeys.lists(), { unread }] as const,
  unreadCount: () => [...notificationsKeys.all, "unread-count"] as const,
  prefs: () => [...notificationsKeys.all, "prefs"] as const,
} as const;
