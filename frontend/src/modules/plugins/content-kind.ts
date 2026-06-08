import type { ContentKind } from "@/api";
import type { BlueprintSummary } from "@/shared/types/server-types.types";
import { Boxes, Puzzle, type LucideIcon } from "lucide-react";

/**
 * Per-kind presentation/wiring config so the plugin and mod managers can share
 * the same orchestrator components, differing only by i18n namespace, install
 * folder, Modrinth project type, icon and availability rule
 */
export interface ContentKindConfig {
  kind: ContentKind;
  /** Root i18n namespace */
  i18nNs: string;
  /** Server sub-directory */
  installFolder: "plugins" | "mods";
  /** Modrinth project type used for the modrinth.com link */
  modrinthType: "plugin" | "mod";
  icon: LucideIcon;
  /** Whether this content kind is usable on the given server's blueprint */
  isAvailable: (blueprint: BlueprintSummary | undefined) => boolean;
  /** Loader to constrain the catalog search to (undefined = no constraint) */
  searchLoader: (blueprint: BlueprintSummary | undefined) => string | undefined;
}

export const CONTENT_KINDS: Record<ContentKind, ContentKindConfig> = {
  plugin: {
    kind: "plugin",
    i18nNs: "modules.plugins",
    installFolder: "plugins",
    modrinthType: "plugin",
    icon: Puzzle,
    isAvailable: (bp) => !!bp?.features.includes("plugins:modrinth"),
    searchLoader: () => undefined,
  },
  mod: {
    kind: "mod",
    i18nNs: "modules.mods",
    installFolder: "mods",
    modrinthType: "mod",
    icon: Boxes,
    isAvailable: (bp) => !!bp?.features.includes("mods:fabric"),
    searchLoader: (bp) =>
      bp?.features.includes("mods:fabric") ? "fabric" : undefined,
  },
};

export function getContentKind(kind: ContentKind): ContentKindConfig {
  return CONTENT_KINDS[kind];
}
