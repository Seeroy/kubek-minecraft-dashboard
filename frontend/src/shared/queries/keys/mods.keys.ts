export const modsKeys = {
  all: ["mods"] as const,
  installed: (serverId: string) =>
    [...modsKeys.all, "installed", serverId] as const,
  available: (query: string, page: number) =>
    [...modsKeys.all, "available", query, page] as const,
  availableInfinite: (query?: string, gameVersion?: string, loader?: string) =>
    [
      ...modsKeys.all,
      "available",
      "infinite",
      query,
      gameVersion,
      loader,
    ] as const,
} as const;
