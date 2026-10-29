import type { ContentSearchParams } from "@/api";

export const modsKeys = {
  all: ["mods"] as const,
  installed: (serverId: string) => [...modsKeys.all, "installed", serverId] as const,
  search: (params: Omit<ContentSearchParams, "offset" | "limit">) => [...modsKeys.all, "search", params] as const,
  project: (projectId: string) => [...modsKeys.all, "project", projectId] as const,
  versions: (projectId: string) => [...modsKeys.all, "versions", projectId] as const,
} as const;
