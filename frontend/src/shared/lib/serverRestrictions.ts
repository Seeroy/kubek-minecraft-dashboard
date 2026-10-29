import type { BlueprintSummary } from "@/shared/types/server-types.types";

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
      return bp.features.includes("plugins:modrinth");
    case "/mods":
      return bp.features.includes("mods:fabric");
    case "/java":
      return bp.variables.some((v) => v.key === "JAVA_VERSION");
    case "/players":
      return playerListsAllowed(bp);
    default:
      return true;
  }
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
