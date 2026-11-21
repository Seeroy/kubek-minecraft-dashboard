export type PlayerList = "whitelist" | "ops" | "bans" | "ipBans";

export interface PlayerEntry {
  uuid: string;
  name: string;
}

export interface OpEntry extends PlayerEntry {
  level: number;
  bypassesPlayerLimit: boolean;
}

interface BanFields {
  reason: string;
  source: string;
  /** ms epoch, null when the file has no readable date */
  createdAt: number | null;
  /** ms epoch, null for a permanent ban */
  expiresAt: number | null;
}

export interface BanEntry extends PlayerEntry, BanFields {}

export interface IpBanEntry extends BanFields {
  ip: string;
}

export interface PlayerLists {
  whitelist: PlayerEntry[];
  ops: OpEntry[];
  bans: BanEntry[];
  ipBans: IpBanEntry[];
}

export interface PlayersSettings {
  whitelist: boolean;
  enforceWhitelist: boolean;
  onlineMode: boolean;
  /** Level a plain op command grants, op-permission-level */
  opPermissionLevel: number;
}

export interface PlayersOverview extends PlayerLists {
  settings: PlayersSettings;
  /** Changes go through console commands, else the panel writes the files */
  live: boolean;
}

/** How a UUID was obtained: Mojang account or offline mode hash */
export type PlayerUuidSource = "mojang" | "offline";

export interface ResolvedPlayer extends PlayerEntry {
  source: PlayerUuidSource;
}

/** A player the server has seen, from usercache.json and the saved player files */
export interface KnownPlayer {
  uuid: string;
  /** null when the usercache has forgotten the name */
  name: string | null;
  /** ms epoch of the player file, the server saves it on logout and autosave */
  savedAt: number | null;
}

export interface KnownPlayersPage {
  items: KnownPlayer[];
  /** Matches across all pages */
  total: number;
}

export type PlayerGamemode =
  "survival" | "creative" | "adventure" | "spectator";

export interface PlayerPosition {
  dimension: string;
  x: number;
  y: number;
  z: number;
}

export interface PlayerStats {
  playTimeTicks: number;
  deaths: number;
  mobKills: number;
  playerKills: number;
  distanceCm: number;
  jumps: number;
}

/** From the saved files, lags behind an online player */
export interface PlayerDetails extends KnownPlayer {
  gamemode: PlayerGamemode | null;
  health: number | null;
  food: number | null;
  xpLevel: number | null;
  position: PlayerPosition | null;
  lastDeath: PlayerPosition | null;
  stats: PlayerStats | null;
}
