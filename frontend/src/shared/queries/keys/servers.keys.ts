export const serversKeys = {
  all: ["servers"] as const,
  list: () => [...serversKeys.all, "list"] as const,
  byId: (id: string) => [...serversKeys.all, "detail", id] as const,
} as const;
