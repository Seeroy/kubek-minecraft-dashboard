export enum AccessArea {
  CONSOLE = "console",
  POWER = "power",
  SETTINGS = "settings",
  FILES = "files",
  CONTENT = "content",
  PLAYERS = "players",
  BACKUPS = "backups",
  SCHEDULER = "scheduler",
  SERVERS = "servers",
  NETWORKS = "networks",
  ACCOUNTS = "accounts",
  AUDIT = "audit",
  MONITORING = "monitoring",
  JAVA = "java",
  STORAGES = "storages",
  INTEGRATIONS = "integrations",
  ASSISTANT = "assistant",
  PANEL = "panel",
}

export type AccessLevel = "read" | "write" | "manage";

export type AccessMap = Partial<Record<AccessArea, AccessLevel>>;

export const ACCESS_LEVELS: readonly AccessLevel[] = [
  "read",
  "write",
  "manage",
];

/** Levels that mean something in an area, others are never stored */
export const AREA_LEVELS: Record<AccessArea, readonly AccessLevel[]> = {
  [AccessArea.CONSOLE]: ["read", "write"],
  [AccessArea.POWER]: ["read", "write", "manage"],
  [AccessArea.SETTINGS]: ["read", "write", "manage"],
  [AccessArea.FILES]: ["read", "write", "manage"],
  [AccessArea.CONTENT]: ["read", "write", "manage"],
  [AccessArea.PLAYERS]: ["read", "write", "manage"],
  [AccessArea.BACKUPS]: ["read", "write", "manage"],
  [AccessArea.SCHEDULER]: ["read", "write", "manage"],
  [AccessArea.SERVERS]: ["write", "manage"],
  [AccessArea.NETWORKS]: ["read", "write", "manage"],
  [AccessArea.ACCOUNTS]: ["read", "write", "manage"],
  [AccessArea.AUDIT]: ["read", "manage"],
  [AccessArea.MONITORING]: ["read"],
  [AccessArea.JAVA]: ["read", "write", "manage"],
  [AccessArea.STORAGES]: ["read", "manage"],
  [AccessArea.INTEGRATIONS]: ["manage"],
  [AccessArea.ASSISTANT]: ["read", "manage"],
  [AccessArea.PANEL]: ["manage"],
};

/** Areas checked against the account's server list */
export const SERVER_AREAS: readonly AccessArea[] = [
  AccessArea.CONSOLE,
  AccessArea.POWER,
  AccessArea.SETTINGS,
  AccessArea.FILES,
  AccessArea.CONTENT,
  AccessArea.PLAYERS,
  AccessArea.BACKUPS,
  AccessArea.SCHEDULER,
];

export const PANEL_AREAS: readonly AccessArea[] = Object.values(
  AccessArea,
).filter((area) => !SERVER_AREAS.includes(area));

const RANK: Record<AccessLevel, number> = { read: 1, write: 2, manage: 3 };

export function levelAtLeast(
  level: AccessLevel | undefined,
  needed: AccessLevel,
): boolean {
  return !!level && RANK[level] >= RANK[needed];
}

export function maxLevel(
  a: AccessLevel | undefined,
  b: AccessLevel | undefined,
): AccessLevel | undefined {
  if (!a) return b;
  if (!b) return a;
  return RANK[a] >= RANK[b] ? a : b;
}

/** Highest level per area over all maps */
export function mergeAccess(...maps: AccessMap[]): AccessMap {
  const merged: AccessMap = {};
  for (const map of maps) {
    for (const [area, level] of Object.entries(map) as [
      AccessArea,
      AccessLevel,
    ][]) {
      merged[area] = maxLevel(merged[area], level);
    }
  }
  return merged;
}

export function isAccessArea(value: string): value is AccessArea {
  return (Object.values(AccessArea) as string[]).includes(value);
}

export function isAreaLevel(
  area: AccessArea,
  level: string,
): level is AccessLevel {
  return (AREA_LEVELS[area] as readonly string[]).includes(level);
}

/** Every level of a is covered by b */
export function accessWithin(a: AccessMap, b: AccessMap): boolean {
  return (Object.entries(a) as [AccessArea, AccessLevel][]).every(
    ([area, level]) => levelAtLeast(b[area], level),
  );
}
