export const backupsKeys = {
  all: ["backups"] as const,
  list: () => [...backupsKeys.all, "list"] as const,
  byServer: (serverId: string) =>
    [...backupsKeys.all, "byServer", serverId] as const,
  byId: (id: string) => [...backupsKeys.all, "detail", id] as const,
} as const;
