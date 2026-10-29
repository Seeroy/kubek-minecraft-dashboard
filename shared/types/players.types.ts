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
