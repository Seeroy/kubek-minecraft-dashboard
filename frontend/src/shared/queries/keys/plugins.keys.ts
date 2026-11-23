import type { ContentSearchParams } from "@/api";

export const pluginsKeys = {
  all: ["plugins"] as const,
  installed: (serverId: string) => [...pluginsKeys.all, "installed", serverId] as const,
  // Under installed, so every refresh of the list refreshes the sidebar badge too
  updates: (serverId: string) => [...pluginsKeys.installed(serverId), "updates"] as const,
  searches: () => [...pluginsKeys.all, "search"] as const,
  search: (params: Omit<ContentSearchParams, "offset" | "limit">) => [...pluginsKeys.searches(), params] as const,
  project: (projectId: string) => [...pluginsKeys.all, "project", projectId] as const,
  versions: (projectId: string) => [...pluginsKeys.all, "versions", projectId] as const,
} as const;
