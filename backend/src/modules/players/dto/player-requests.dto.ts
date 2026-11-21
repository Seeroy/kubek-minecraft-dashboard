import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import type { PlayerGamemode } from "@shared/types/players.types";
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsInt,
  IsIP,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { PLAYER_NAME } from "../players.constants";

const GAMEMODES: PlayerGamemode[] = [
  "survival",
  "creative",
  "adventure",
  "spectator",
];
// World border limit, past it the command fails anyway
const MAX_COORD = 30_000_000;

export class PlayerNameDto {
  @ApiProperty({ description: "Player name", example: "Steve" })
  @IsString()
  @Matches(PLAYER_NAME, { message: "Invalid player name" })
  name!: string;
}

export class AddOpDto extends PlayerNameDto {
  @ApiPropertyOptional({
    description: "Permission level, only on a stopped server",
    minimum: 1,
    maximum: 4,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  level?: number;

  @ApiPropertyOptional({
    description: "Join a full server, only on a stopped server",
  })
  @IsOptional()
  @IsBoolean()
  bypassesPlayerLimit?: boolean;
}

class BanFieldsDto {
  @ApiPropertyOptional({ description: "Ban reason", maxLength: 256 })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  reason?: string;

  @ApiPropertyOptional({
    description: "Expiry as ms epoch, only on a stopped server",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  expiresAt?: number;
}

export class AddBanDto extends BanFieldsDto {
  @ApiProperty({ description: "Player name", example: "Steve" })
  @IsString()
  @Matches(PLAYER_NAME, { message: "Invalid player name" })
  name!: string;
}

export class AddIpBanDto extends BanFieldsDto {
  @ApiProperty({ description: "IP address", example: "203.0.113.7" })
  @IsIP()
  ip!: string;
}

export class KickPlayerDto extends PlayerNameDto {
  @ApiPropertyOptional({ description: "Kick message", maxLength: 256 })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  reason?: string;
}

export class UpdatePlayersSettingsDto {
  @ApiPropertyOptional({ description: "white-list in server.properties" })
  @IsOptional()
  @IsBoolean()
  whitelist?: boolean;

  @ApiPropertyOptional({
    description: "enforce-whitelist in server.properties",
  })
  @IsOptional()
  @IsBoolean()
  enforceWhitelist?: boolean;
}

export class GamemodeDto extends PlayerNameDto {
  @ApiProperty({ enum: GAMEMODES })
  @IsIn(GAMEMODES)
  gamemode!: PlayerGamemode;
}

export class TeleportDto extends PlayerNameDto {
  @ApiProperty()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-MAX_COORD)
  @Max(MAX_COORD)
  x!: number;

  @ApiProperty()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-4096)
  @Max(4096)
  y!: number;

  @ApiProperty()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-MAX_COORD)
  @Max(MAX_COORD)
  z!: number;

  @ApiPropertyOptional({
    description: "Dimension id, the player's current one when omitted",
    example: "minecraft:the_nether",
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Matches(/^[a-z0-9_.-]+:[a-z0-9_./-]+$/, { message: "Invalid dimension" })
  dimension?: string;
}

export class KnownPlayersQueryDto {
  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page: number = 0;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 25;

  @ApiPropertyOptional({ description: "Part of a name or UUID" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  search?: string;
}
