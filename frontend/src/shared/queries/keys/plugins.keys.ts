export const pluginsKeys = {
  all: ["plugins"] as const,
  installed: (serverId: string) =>
    [...pluginsKeys.all, "installed", serverId] as const,
  available: (query: string, page: number) =>
    [...pluginsKeys.all, "available", query, page] as const,
  availableInfinite: (query?: string, gameVersion?: string, loader?: string) =>
    [
      ...pluginsKeys.all,
      "available",
      "infinite",
      query,
      gameVersion,
      loader,
    ] as const,
} as const;
