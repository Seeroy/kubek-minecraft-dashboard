import type { PlayerGamemode } from "@shared/types/players.types";

export type {
  BanEntry,
  IpBanEntry,
  KnownPlayer,
  KnownPlayersPage,
  OpEntry,
  PlayerDetails,
  PlayerEntry,
  PlayerGamemode,
  PlayerList,
  PlayerPosition,
  PlayersOverview,
  PlayersSettings,
  PlayerStats,
  ResolvedPlayer,
} from "@shared/types/players.types";

export interface AddOpRequest {
  name: string;
  level?: number;
  bypassesPlayerLimit?: boolean;
}

export interface AddBanRequest {
  name: string;
  reason?: string;
  /** ms epoch, omitted for a permanent ban */
  expiresAt?: number;
}

export interface AddIpBanRequest {
  ip: string;
  reason?: string;
  expiresAt?: number;
}

export interface KickRequest {
  name: string;
  reason?: string;
}

export interface UpdatePlayersSettingsRequest {
  whitelist?: boolean;
  enforceWhitelist?: boolean;
}

export interface GamemodeRequest {
  name: string;
  gamemode: PlayerGamemode;
}

export interface TeleportRequest {
  name: string;
  x: number;
  y: number;
  z: number;
  /** Namespaced id, the player's current dimension when omitted */
  dimension?: string;
}

export interface KnownPlayersParams {
  page: number;
  pageSize: number;
  search?: string;
}
