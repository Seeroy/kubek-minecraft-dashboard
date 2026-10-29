export const serverLogsKeys = {
  all: ["serverLogs"] as const,
  files: (serverId: string) =>
    [...serverLogsKeys.all, "files", serverId] as const,
  content: (serverId: string, file: string) =>
    [...serverLogsKeys.all, "content", serverId, file] as const,
} as const;
