import type { ContentSearchParams } from "@/api";

export const pluginsKeys = {
  all: ["plugins"] as const,
  installed: (serverId: string) => [...pluginsKeys.all, "installed", serverId] as const,
  search: (params: Omit<ContentSearchParams, "offset" | "limit">) => [...pluginsKeys.all, "search", params] as const,
  project: (projectId: string) => [...pluginsKeys.all, "project", projectId] as const,
  versions: (projectId: string) => [...pluginsKeys.all, "versions", projectId] as const,
} as const;
