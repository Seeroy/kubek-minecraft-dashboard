export type { BanEntry, IpBanEntry, OpEntry, PlayerEntry, PlayerList, PlayersOverview, PlayersSettings, ResolvedPlayer } from "@shared/types/players.types";

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
