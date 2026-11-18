import { AccessMapDto, IsAccessMap } from "@/core/dto/access.dto";
import { ApiProperty } from "@nestjs/swagger";
import type { AccessMap } from "@shared/access/areas";
import type { ApiKeyView } from "@shared/types/api-key.types";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from "class-validator";

export class ApiKeyDto implements ApiKeyView {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: "Owner account id" })
  userId: string;

  @ApiProperty({
    required: false,
    description: "Owner name, only in the list of all keys",
  })
  username?: string;

  @ApiProperty({ example: "Grafana" })
  name: string;

  @ApiProperty({ description: "Start of the token", example: "kbk_Ab12Cd34" })
  prefix: string;

  @ApiProperty({ type: AccessMapDto })
  grants: AccessMapDto;

  @ApiProperty({
    type: [String],
    nullable: true,
    description: "Servers the key reaches, null for all of the owner's",
  })
  servers: string[] | null;

  @ApiProperty({ description: "Key may connect over MCP" })
  mcp: boolean;

  @ApiProperty()
  createdAt: number;

  @ApiProperty({ nullable: true, type: Number })
  expiresAt: number | null;

  @ApiProperty({ nullable: true, type: Number })
  lastUsedAt: number | null;

  @ApiProperty({ nullable: true, type: String })
  lastUsedIp: string | null;
}

export class CreatedApiKeyDto {
  @ApiProperty({ type: ApiKeyDto })
  key: ApiKeyDto;

  @ApiProperty({ description: "Full token, shown only once" })
  token: string;
}

export class CreateApiKeyDto {
  @ApiProperty({ example: "Grafana", maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name: string;

  @ApiProperty({ type: AccessMapDto })
  @IsAccessMap()
  grants: AccessMap;

  @ApiProperty({
    type: [String],
    nullable: true,
    required: false,
    description: "Servers the key reaches, null or missing for all",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  servers?: string[] | null;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  mcp?: boolean;

  @ApiProperty({
    nullable: true,
    required: false,
    type: Number,
    description: "Expiry time (ms epoch), null for a key that never expires",
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  expiresAt?: number | null;
}

export class UpdateApiKeyDto {
  @ApiProperty({ required: false, maxLength: 64 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name?: string;

  @ApiProperty({ type: AccessMapDto, required: false })
  @IsOptional()
  @IsAccessMap()
  grants?: AccessMap;

  @ApiProperty({ type: [String], nullable: true, required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  servers?: string[] | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  mcp?: boolean;
}
