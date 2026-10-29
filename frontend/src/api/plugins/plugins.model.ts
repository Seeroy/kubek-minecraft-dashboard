import type { components } from "../types";

export type ModrinthSearchResponse = components["schemas"]["ModrinthSearchResponseDto"];
export type ModrinthSearchHit = components["schemas"]["ModrinthSearchHitDto"];
export type ModrinthProject = components["schemas"]["ModrinthProjectDto"];
// Shared type follows the raw snake_case API shape
export type { ModrinthVersion } from "@shared/types/plugins";
export type InstalledPluginView = components["schemas"]["InstalledContentDto"];
export type ContentTaskRef = components["schemas"]["TaskRefResponseDto"];

export type PluginInstallDependencyInput = components["schemas"]["InstallPluginDependencyDto"];

/** Whether managing - server plugins or mods */
export type ContentKind = "plugin" | "mod";

export type InstallContentPayload = components["schemas"]["InstallPluginDto"];
export type UpdateContentPayload = components["schemas"]["UpdatePluginDto"];

export interface RemoveContentPayload {
  removeDependants?: boolean;
}

export type ContentSearchParams = {
  query?: string;
  limit?: number;
  offset?: number;
  gameVersion?: string;
  loader?: string;
  categories?: string[];
  index?: ContentSortIndex;
};

export type ContentSortIndex = "relevance" | "downloads" | "follows" | "newest" | "updated";
