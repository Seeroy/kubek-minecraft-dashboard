import { ApiProperty } from "@nestjs/swagger";
import type {
  KnownPlayer,
  KnownPlayersPage,
  PlayerDetails,
  PlayerGamemode,
  PlayerPosition,
  PlayerStats,
  BanEntry,
  IpBanEntry,
  OpEntry,
  PlayerEntry,
  PlayersOverview,
  PlayersSettings,
  PlayerUuidSource,
  ResolvedPlayer,
} from "@shared/types/players.types";

export class PlayerEntryDto implements PlayerEntry {
  @ApiProperty({ example: "8667ba71-b85a-4004-af54-457a9734eed7" })
  uuid!: string;

  @ApiProperty({ example: "Steve" })
  name!: string;
}

export class OpEntryDto extends PlayerEntryDto implements OpEntry {
  @ApiProperty({ minimum: 1, maximum: 4 })
  level!: number;

  @ApiProperty()
  bypassesPlayerLimit!: boolean;
}

export class BanEntryDto extends PlayerEntryDto implements BanEntry {
  @ApiProperty()
  reason!: string;

  @ApiProperty()
  source!: string;

  @ApiProperty({ type: Number, nullable: true, description: "ms epoch" })
  createdAt!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: "ms epoch, null for a permanent ban",
  })
  expiresAt!: number | null;
}

export class IpBanEntryDto implements IpBanEntry {
  @ApiProperty({ example: "203.0.113.7" })
  ip!: string;

  @ApiProperty()
  reason!: string;

  @ApiProperty()
  source!: string;

  @ApiProperty({ type: Number, nullable: true })
  createdAt!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  expiresAt!: number | null;
}

export class PlayersSettingsDto implements PlayersSettings {
  @ApiProperty()
  whitelist!: boolean;

  @ApiProperty()
  enforceWhitelist!: boolean;

  @ApiProperty()
  onlineMode!: boolean;

  @ApiProperty({ minimum: 1, maximum: 4 })
  opPermissionLevel!: number;
}

export class PlayersOverviewDto implements PlayersOverview {
  @ApiProperty({ type: [PlayerEntryDto] })
  whitelist!: PlayerEntryDto[];

  @ApiProperty({ type: [OpEntryDto] })
  ops!: OpEntryDto[];

  @ApiProperty({ type: [BanEntryDto] })
  bans!: BanEntryDto[];

  @ApiProperty({ type: [IpBanEntryDto] })
  ipBans!: IpBanEntryDto[];

  @ApiProperty({ type: PlayersSettingsDto })
  settings!: PlayersSettingsDto;

  @ApiProperty({
    description: "Changes go through the console of a running server",
  })
  live!: boolean;
}

export class ResolvedPlayerDto
  extends PlayerEntryDto
  implements ResolvedPlayer
{
  @ApiProperty({ enum: ["mojang", "offline"] })
  source!: PlayerUuidSource;
}

export class KnownPlayerDto implements KnownPlayer {
  @ApiProperty({ example: "8667ba71-b85a-4004-af54-457a9734eed7" })
  uuid!: string;

  @ApiProperty({ type: String, nullable: true, example: "Steve" })
  name!: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: "ms epoch of the player file",
  })
  savedAt!: number | null;
}

export class KnownPlayersPageDto implements KnownPlayersPage {
  @ApiProperty({ type: [KnownPlayerDto] })
  items!: KnownPlayerDto[];

  @ApiProperty({ description: "Matches across all pages" })
  total!: number;
}

export class PlayerPositionDto implements PlayerPosition {
  @ApiProperty({ example: "minecraft:overworld" })
  dimension!: string;

  @ApiProperty()
  x!: number;

  @ApiProperty()
  y!: number;

  @ApiProperty()
  z!: number;
}

export class PlayerStatsDto implements PlayerStats {
  @ApiProperty({ description: "Game ticks, 20 per second" })
  playTimeTicks!: number;

  @ApiProperty()
  deaths!: number;

  @ApiProperty()
  mobKills!: number;

  @ApiProperty()
  playerKills!: number;

  @ApiProperty({ description: "Walked, swum, flown and ridden, in cm" })
  distanceCm!: number;

  @ApiProperty()
  jumps!: number;
}

export class PlayerDetailsDto extends KnownPlayerDto implements PlayerDetails {
  @ApiProperty({
    enum: ["survival", "creative", "adventure", "spectator"],
    nullable: true,
  })
  gamemode!: PlayerGamemode | null;

  @ApiProperty({ type: Number, nullable: true, description: "Half hearts" })
  health!: number | null;

  @ApiProperty({ type: Number, nullable: true, maximum: 20 })
  food!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  xpLevel!: number | null;

  @ApiProperty({ type: PlayerPositionDto, nullable: true })
  position!: PlayerPositionDto | null;

  @ApiProperty({ type: PlayerPositionDto, nullable: true })
  lastDeath!: PlayerPositionDto | null;

  @ApiProperty({ type: PlayerStatsDto, nullable: true })
  stats!: PlayerStatsDto | null;
}

export class ResetPlayerDataDto {
  @ApiProperty({ description: "Files removed" })
  deleted!: number;
}
