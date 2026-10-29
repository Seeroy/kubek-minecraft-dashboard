import type {
  BanEntry,
  IpBanEntry,
  OpEntry,
  PlayerEntry,
  PlayerList,
  PlayerLists,
} from "@shared/types/players.types";

export type RawEntry = Record<string, unknown>;

export const LIST_FILES: Record<PlayerList, string> = {
  whitelist: "whitelist.json",
  ops: "ops.json",
  bans: "banned-players.json",
  ipBans: "banned-ips.json",
};

interface BanChange {
  reason: string;
  source: string;
  expiresAt: number | null;
}

export type ListChange =
  | { list: "whitelist"; action: "add"; player: PlayerEntry }
  | {
      list: "ops";
      action: "add";
      player: PlayerEntry;
      level: number;
      bypassesPlayerLimit: boolean;
    }
  | ({ list: "bans"; action: "add"; player: PlayerEntry } & BanChange)
  | ({ list: "ipBans"; action: "add"; ip: string } & BanChange)
  | { list: "whitelist"; action: "remove"; name: string }
  | { list: "ops"; action: "remove"; name: string }
  | { list: "bans"; action: "remove"; name: string }
  | { list: "ipBans"; action: "remove"; ip: string };

const FOREVER = "forever";
// What the server itself writes for a ban command without a reason
const DEFAULT_BAN_REASON = "Banned by an operator.";

const text = (value: unknown): string =>
  typeof value === "string" ? value : "";

/** Server JSON entries to API entries, malformed ones are skipped */
export function decodeList<L extends PlayerList>(
  list: L,
  raw: RawEntry[],
): PlayerLists[L] {
  const decode = DECODERS[list] as (entry: RawEntry) => unknown;
  return raw.flatMap((entry) => {
    const decoded = decode(entry);
    return decoded ? [decoded] : [];
  }) as PlayerLists[L];
}

const DECODERS: {
  [L in PlayerList]: (entry: RawEntry) => PlayerLists[L][number] | null;
} = {
  whitelist: (entry) => decodePlayer(entry),
  ops: (entry): OpEntry | null => {
    const player = decodePlayer(entry);
    if (!player) return null;
    return {
      ...player,
      level: typeof entry.level === "number" ? entry.level : 4,
      bypassesPlayerLimit: entry.bypassesPlayerLimit === true,
    };
  },
  bans: (entry): BanEntry | null => {
    const player = decodePlayer(entry);
    return player ? { ...player, ...decodeBan(entry) } : null;
  },
  ipBans: (entry): IpBanEntry | null => {
    const ip = text(entry.ip);
    return ip ? { ip, ...decodeBan(entry) } : null;
  },
};

function decodePlayer(entry: RawEntry): PlayerEntry | null {
  const name = text(entry.name);
  return name ? { name, uuid: text(entry.uuid) } : null;
}

function decodeBan(entry: RawEntry) {
  const expires = text(entry.expires);
  return {
    reason: text(entry.reason),
    source: text(entry.source),
    createdAt: parseServerDate(text(entry.created)),
    expiresAt:
      !expires || expires === FOREVER ? null : parseServerDate(expires),
  };
}

/** Raw list after the change, entries the panel does not know keep their fields */
export function applyChange(
  raw: RawEntry[],
  change: ListChange,
  now = Date.now(),
): RawEntry[] {
  const rest = raw.filter((entry) => !matches(entry, change));
  if (change.action === "remove") return rest;
  return [...rest, encode(change, now)];
}

/** Whether the server's file already reflects the change */
export function isApplied(raw: RawEntry[], change: ListChange): boolean {
  const present = raw.some((entry) => matches(entry, change));
  return change.action === "add" ? present : !present;
}

function matches(entry: RawEntry, change: ListChange): boolean {
  if (change.list === "ipBans") return text(entry.ip) === change.ip;
  if (change.action === "remove") {
    return text(entry.name).toLowerCase() === change.name.toLowerCase();
  }
  const { name, uuid } = change.player;
  return (
    text(entry.name).toLowerCase() === name.toLowerCase() ||
    (!!uuid && text(entry.uuid).toLowerCase() === uuid.toLowerCase())
  );
}

function encode(change: ListChange & { action: "add" }, now: number): RawEntry {
  switch (change.list) {
    case "whitelist":
      return { uuid: change.player.uuid, name: change.player.name };
    case "ops":
      return {
        uuid: change.player.uuid,
        name: change.player.name,
        level: change.level,
        bypassesPlayerLimit: change.bypassesPlayerLimit,
      };
    case "bans":
      return {
        uuid: change.player.uuid,
        name: change.player.name,
        ...encodeBan(change, now),
      };
    case "ipBans":
      return { ip: change.ip, ...encodeBan(change, now) };
  }
}

function encodeBan(change: BanChange, now: number) {
  return {
    created: formatServerDate(now),
    source: change.source,
    expires:
      change.expiresAt === null ? FOREVER : formatServerDate(change.expiresAt),
    reason: change.reason || DEFAULT_BAN_REASON,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** yyyy-MM-dd HH:mm:ss Z, the format the server reads and writes */
export function formatServerDate(ms: number): string {
  const d = new Date(ms);
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} +0000`
  );
}

export function parseServerDate(value: string): number | null {
  const m =
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2})$/.exec(
      value.trim(),
    );
  if (!m) return null;
  const [, y, mo, d, h, mi, s, sign, oh, om] = m;
  const offset =
    (sign === "-" ? -1 : 1) * (Number(oh) * 60 + Number(om)) * 60_000;
  return Date.UTC(+y, +mo - 1, +d, +h, +mi, +s) - offset;
}
