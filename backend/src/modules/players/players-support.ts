import { propertyFlag } from "@/core/properties/properties-values";
import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";
import type { PlayersSettings } from "@shared/types/players.types";
import { DEFAULT_OP_LEVEL } from "./players.constants";

type BlueprintShape = Pick<
  KubekBlueprintManifest,
  "features" | "configFiles"
> & {
  query?: { protocol?: string };
};

/**
 * Java edition servers with server.properties keep the JSON lists,
 * proxies have no lists and Bedrock uses its own files
 */
export function supportsPlayerLists(blueprint: BlueprintShape | undefined) {
  if (!blueprint?.features?.includes("players")) return false;
  if (blueprint.query?.protocol === "minecraft-bedrock") return false;
  return (blueprint.configFiles ?? []).some(
    (file) => file.parser === "properties" && file.path === "server.properties",
  );
}

export function readPlayersSettings(
  props: Record<string, string> | null,
): PlayersSettings {
  const level = Number.parseInt(props?.["op-permission-level"] ?? "", 10);
  const onlineMode = props?.["online-mode"];
  return {
    whitelist: propertyFlag(props?.["white-list"]),
    enforceWhitelist: propertyFlag(props?.["enforce-whitelist"]),
    // The server defaults to online mode when the key is missing
    onlineMode: onlineMode === undefined || propertyFlag(onlineMode),
    opPermissionLevel: level >= 1 && level <= 4 ? level : DEFAULT_OP_LEVEL,
  };
}
