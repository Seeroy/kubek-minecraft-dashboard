import type {
  PlayerGamemode,
  PlayerPosition,
  PlayerStats,
} from "@shared/types/players.types";
import type { NbtCompound, NbtValue } from "./nbt";

export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const GAMEMODES: PlayerGamemode[] = [
  "survival",
  "creative",
  "adventure",
  "spectator",
];

// Numeric ids from before 1.16
const LEGACY_DIMENSIONS: Record<number, string> = {
  [-1]: "minecraft:the_nether",
  0: "minecraft:overworld",
  1: "minecraft:the_end",
};

const num = (value: NbtValue | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const round = (value: number) => Math.round(value * 100) / 100;

function coords(value: NbtValue | undefined) {
  if (!value || typeof value !== "object" || !("length" in value)) return null;
  const [x, y, z] = Array.from(value as ArrayLike<unknown>, Number);
  return [x, y, z].every(Number.isFinite)
    ? { x: round(x), y: round(y), z: round(z) }
    : null;
}

function dimension(value: NbtValue | undefined): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return LEGACY_DIMENSIONS[value] ?? null;
  return null;
}

function position(
  dim: NbtValue | undefined,
  pos: NbtValue | undefined,
): PlayerPosition | null {
  const at = coords(pos);
  const where = dimension(dim);
  return at && where ? { dimension: where, ...at } : null;
}

export function readPlayerNbt(nbt: NbtCompound) {
  const gamemode = num(nbt.playerGameType);
  const death = nbt.LastDeathLocation;
  return {
    gamemode: gamemode === null ? null : (GAMEMODES[gamemode] ?? null),
    health: num(nbt.Health),
    food: num(nbt.foodLevel),
    xpLevel: num(nbt.XpLevel),
    // No Dimension means the overworld
    position: position(nbt.Dimension ?? 0, nbt.Pos),
    lastDeath:
      death &&
      typeof death === "object" &&
      !Array.isArray(death) &&
      !ArrayBuffer.isView(death)
        ? position((death as NbtCompound).dimension, (death as NbtCompound).pos)
        : null,
  };
}

type StatGroup = Record<string, unknown>;

const count = (group: StatGroup | undefined, ...keys: string[]) => {
  for (const key of keys) {
    const value = group?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return 0;
};

const sumMatching = (
  group: StatGroup | undefined,
  test: (key: string) => boolean,
) =>
  Object.entries(group ?? {}).reduce(
    (total, [key, value]) =>
      test(key) && typeof value === "number" && Number.isFinite(value)
        ? total + value
        : total,
    0,
  );

/** stats/<uuid>.json, the 1.13+ layout and the flat one before it */
export function readPlayerStats(json: unknown): PlayerStats | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;

  const modern = (root.stats as Record<string, StatGroup> | undefined)?.[
    "minecraft:custom"
  ];
  if (modern && typeof modern === "object") {
    return {
      playTimeTicks: count(
        modern,
        "minecraft:play_time",
        "minecraft:play_one_minute",
      ),
      deaths: count(modern, "minecraft:deaths"),
      mobKills: count(modern, "minecraft:mob_kills"),
      playerKills: count(modern, "minecraft:player_kills"),
      distanceCm: sumMatching(
        modern,
        (key) => key.endsWith("_one_cm") && key !== "minecraft:fall_one_cm",
      ),
      jumps: count(modern, "minecraft:jump"),
    };
  }

  if (!Object.keys(root).some((key) => key.startsWith("stat."))) return null;
  return {
    playTimeTicks: count(root, "stat.playOneMinute"),
    deaths: count(root, "stat.deaths"),
    mobKills: count(root, "stat.mobKills"),
    playerKills: count(root, "stat.playerKills"),
    distanceCm: sumMatching(
      root,
      (key) => key.endsWith("OneCm") && key !== "stat.fallOneCm",
    ),
    jumps: count(root, "stat.jump"),
  };
}

export interface UserCacheEntry {
  uuid: string;
  name: string;
}

/** usercache.json, broken entries are skipped */
export function readUserCache(json: unknown): UserCacheEntry[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((entry) => {
    const { uuid, name } = (entry ?? {}) as Record<string, unknown>;
    return typeof uuid === "string" &&
      typeof name === "string" &&
      UUID.test(uuid)
      ? [{ uuid: uuid.toLowerCase(), name }]
      : [];
  });
}
