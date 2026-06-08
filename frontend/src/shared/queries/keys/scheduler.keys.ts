export const schedulerKeys = {
  all: ["scheduler"] as const,
  tasksByServer: (serverId: string) =>
    [...schedulerKeys.all, "tasks", serverId] as const,
  // Prefix for invalidating every run of a server (any taskId/status)
  runs: (serverId: string) => [...schedulerKeys.all, "runs", serverId] as const,
  runsByServer: (serverId: string, taskId?: string, status?: string) =>
    [
      ...schedulerKeys.runs(serverId),
      taskId ?? "all",
      status ?? "all",
    ] as const,
} as const;
