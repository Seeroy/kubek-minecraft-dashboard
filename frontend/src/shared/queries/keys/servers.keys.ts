export const serversKeys = {
  all: ["servers"] as const,
  list: () => [...serversKeys.all, "list"] as const,
  byId: (id: string) => [...serversKeys.all, "detail", id] as const,
  properties: (id: string) => [...serversKeys.all, "properties", id] as const,
  // Own root so list invalidations do not refetch every icon
  icon: (id: string) => ["server-icon", id] as const,
} as const;
