export const playersKeys = {
  all: ["players"] as const,
  overview: (serverId: string) => [...playersKeys.all, "overview", serverId] as const,
} as const;
