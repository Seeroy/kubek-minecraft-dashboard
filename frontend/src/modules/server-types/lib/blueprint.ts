import type { BlueprintSummary } from "@/shared/types/server-types.types";
import type { Tone } from "@/shared/ui/tone";
import type { BlueprintFeature } from "@kubekpanel/blueprint-sdk";

export const FEATURE_TONE: Record<BlueprintFeature, Tone> = {
  console: "blue",
  backups: "cyan",
  files: "amber",
  players: "green",
  "plugins:modrinth": "purple",
  "mods:fabric": "orange",
};

// The bundled blueprint id suffix matches the core icon asset name (paper, purpur, ...)
export const iconType = (id: string) => id.split(".").pop() ?? "custom";

// Bundled games go first in this order, the rest by name
const KNOWN_GAMES: Record<string, string> = {
  minecraft: "Minecraft: Java Edition",
  "minecraft-bedrock": "Minecraft: Bedrock Edition",
};
const KNOWN_ORDER = Object.keys(KNOWN_GAMES);

/** Minecraft servers don't start until their owner accepts the EULA */
export const needsMinecraftEula = (bp: Pick<BlueprintSummary, "game">) =>
  bp.game === "minecraft" || bp.game === "minecraft-bedrock";

export const gameTitle = (bp: Pick<BlueprintSummary, "game" | "gameName">) =>
  KNOWN_GAMES[bp.game] ?? bp.gameName ?? bp.game;

export interface GameGroup {
  game: string;
  title: string;
  blueprints: BlueprintSummary[];
}

/** Blueprints grouped by game, each group keeps the order it got */
export function groupByGame(blueprints: BlueprintSummary[]): GameGroup[] {
  const groups = new Map<string, GameGroup>();
  for (const bp of blueprints) {
    let group = groups.get(bp.game);
    if (!group) {
      group = { game: bp.game, title: gameTitle(bp), blueprints: [] };
      groups.set(bp.game, group);
    }
    group.blueprints.push(bp);
  }
  const rank = (game: string) => {
    const i = KNOWN_ORDER.indexOf(game);
    return i === -1 ? KNOWN_ORDER.length : i;
  };
  return [...groups.values()].sort((a, b) => rank(a.game) - rank(b.game) || a.title.localeCompare(b.title));
}
