export const backupsKeys = {
  all: ["backups"] as const,
  byServer: (serverId: string) => [...backupsKeys.all, "byServer", serverId] as const,
  fileScan: (serverId: string) => [...backupsKeys.byServer(serverId), "scan"] as const,
  journal: (serverId: string) => [...backupsKeys.all, "journal", serverId] as const,
  policies: () => [...backupsKeys.all, "policy"] as const,
  policy: (serverId: string) => [...backupsKeys.policies(), serverId] as const,
  policyPreview: (serverId: string, draft: unknown) => [...backupsKeys.all, "policyPreview", serverId, draft] as const,
  defaultPolicy: () => [...backupsKeys.policies(), "defaults"] as const,
  storages: () => [...backupsKeys.all, "storages"] as const,
  orphans: () => [...backupsKeys.all, "orphans"] as const,
} as const;
