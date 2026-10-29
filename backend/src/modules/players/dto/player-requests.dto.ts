import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
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
