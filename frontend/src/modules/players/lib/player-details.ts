import type { CompanionPlayer, PlayerDetails, PlayerGamemode } from "@/api";

export const GAMEMODES: PlayerGamemode[] = ["survival", "creative", "adventure", "spectator"];

export const DIMENSIONS = ["minecraft:overworld", "minecraft:the_nether", "minecraft:the_end"];

// Modded and plugin worlds keep their id
export const dimensionLabel = (t: (key: string) => string, id: string) => (DIMENSIONS.includes(id) ? t(`dimensions.${id}`) : id);

// 20 ticks a second
export const TICKS_PER_HOUR = 72_000;

export const CM_PER_KM = 100_000;

export const formatNumber = (value: number, digits = 0) => value.toLocaleString(undefined, { maximumFractionDigits: digits });

export function parseCoords(coords: { x: string; y: string; z: string }) {
  const values = [coords.x, coords.y, coords.z].map((value) => (value.trim() === "" ? Number.NaN : Number(value)));
  if (!values.every(Number.isFinite)) return null;
  const [x, y, z] = values;
  return { x, y, z };
}

export type PlayerStateView = Pick<PlayerDetails, "gamemode" | "health" | "food" | "xpLevel" | "position" | "lastDeath">;

/** Live values win, the plugin's position uses the world name */
export function withLive(details: PlayerDetails, live: CompanionPlayer | null): PlayerStateView {
  const saved = { gamemode: details.gamemode, health: details.health, food: details.food, xpLevel: details.xpLevel, position: details.position, lastDeath: details.lastDeath };
  if (!live) return saved;
  const gamemode = live.gamemode.toLowerCase() as PlayerGamemode;
  return {
    ...saved,
    gamemode: GAMEMODES.includes(gamemode) ? gamemode : saved.gamemode,
    health: live.health ?? saved.health,
    food: live.food ?? saved.food,
    xpLevel: live.level ?? saved.xpLevel,
    position: live.x != null && live.y != null && live.z != null ? { dimension: live.world, x: live.x, y: live.y, z: live.z } : saved.position,
  };
}
