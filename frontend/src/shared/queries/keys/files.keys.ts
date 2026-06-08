export const filesKeys = {
  all: ["files"] as const,
  // Prefix for invalidating every scan query of a server (any path)
  scanByServer: (serverId: string) =>
    [...filesKeys.all, "scan", serverId] as const,
  scan: (serverId: string, path: string) =>
    [...filesKeys.scanByServer(serverId), path] as const,
  search: (serverId: string, query: string) =>
    [...filesKeys.all, "search", serverId, query] as const,
} as const;
