export const playersKeys = {
  all: ["players"] as const,
  overview: (serverId: string) => [...playersKeys.all, "overview", serverId] as const,
  known: (serverId: string) => [...playersKeys.all, "known", serverId] as const,
  knownPage: (serverId: string, page: number, pageSize: number, search: string) => [...playersKeys.known(serverId), "page", page, pageSize, search] as const,
  details: (serverId: string, id: string) => [...playersKeys.known(serverId), "details", id.toLowerCase()] as const,
} as const;
