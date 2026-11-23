import type { BlueprintFeature, BlueprintSummary } from "@/shared/types/server-types.types";

/**
 * Decide whether a server-settings tab is available from the server's blueprint
 */
export function settingsTabAllowedByBlueprint(
  tab: string,
  bp: BlueprintSummary
): boolean {
  const hasProperties = bp.configFiles.some((c) => c.parser === "properties");
  switch (tab) {
    case "general":
      return true;
    case "java":
      return bp.variables.some((v) => v.key === "JAVA_VERSION");
    case "information":
    case "gameplay":
    case "world":
    case "network":
    case "other":
      return hasProperties;
    case "velocity":
      return bp.id === "com.kubek.velocity";
    case "companion":
      return bp.features.includes("plugins:modrinth");
    case "configs":
      return bp.configFiles.length > 0;
    default:
      return true;
  }
}

/** Decide whether a sidebar route is available from the server's blueprint */
export function routeAllowedByBlueprint(
  href: string,
  bp: BlueprintSummary
): boolean {
  switch (href) {
    case "/plugins":
    // Kubek Companion runs where Bukkit plugins run
    case "/performance":
      return bp.features.includes("plugins:modrinth");
    case "/mods":
      return bp.features.includes("mods:fabric");
    case "/java":
      return bp.variables.some((v) => v.key === "JAVA_VERSION");
    case "/players":
      return playerListsAllowed(bp);
    default: {
      const feature = BASE_FEATURE_ROUTES[href];
      return feature ? baseFeatureAllowed(bp, feature) : true;
    }
  }
}

/** Pages every server had before blueprints declared features */
export const BASE_FEATURE_ROUTES: Partial<Record<string, BaseFeature>> = {
  "/console": "console",
  "/backups": "backups",
  "/files": "files",
};

export type BaseFeature = Extract<BlueprintFeature, "console" | "backups" | "files">;

// An empty features list comes from blueprints made before features existed, they keep everything
export function baseFeatureAllowed(bp: BlueprintSummary, feature: BaseFeature): boolean {
  return bp.features.length === 0 || bp.features.includes(feature);
}

// Proxies have no server.properties
export function hasServerProperties(bp: BlueprintSummary): boolean {
  return bp.configFiles.some(
    (c) => c.parser === "properties" && c.path === "server.properties"
  );
}

// Java servers keep whitelist.json and friends, proxies and Bedrock do not
export function playerListsAllowed(bp: BlueprintSummary): boolean {
  return (
    bp.features.includes("players") &&
    bp.queryProtocol !== "minecraft-bedrock" &&
    hasServerProperties(bp)
  );
}
