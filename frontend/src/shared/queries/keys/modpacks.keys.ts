import type { ModpackSearchParams } from "@/api";

export const modpacksKeys = {
  all: ["modpacks"] as const,
  search: (params: Omit<ModpackSearchParams, "offset" | "limit">) => [...modpacksKeys.all, "search", params] as const,
  versions: (projectId: string) => [...modpacksKeys.all, "versions", projectId] as const,
} as const;
