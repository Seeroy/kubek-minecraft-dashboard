import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  ForwardingMode,
  NetworkWizardProps,
  NewBackendProps,
  NewProxyProps,
  VelocitySettings,
} from "@shared/types/network.types";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

const RUNTIMES = ["native", "docker"] as const;
const MODES: ForwardingMode[] = ["modern", "legacy"];

export class NewProxyDto implements NewProxyProps {
  @ApiProperty({ example: "Proxy" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  @ApiProperty({ example: "3.4.0" })
  @IsString()
  @IsNotEmpty()
  version!: string;

  @ApiPropertyOptional({ description: "Picked by the panel when omitted" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional({ description: "Max heap in MB", example: 512 })
  @IsOptional()
  @IsInt()
  @Min(256)
  memory?: number;

  @ApiPropertyOptional({ enum: RUNTIMES })
  @IsOptional()
  @IsIn(RUNTIMES)
  runtime?: "native" | "docker";

  @ApiPropertyOptional({ description: "Extra JVM arguments" })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  jvmArgs?: string;
}

export class NewBackendDto extends NewProxyDto implements NewBackendProps {
  @ApiProperty({ example: "com.kubek.paper" })
  @IsString()
  blueprintId!: string;
}

export class VelocitySettingsDto implements Partial<VelocitySettings> {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  showMaxPlayers?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  onlineMode?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  forceKeyAuthentication?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  preventClientProxyConnections?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  kickExistingPlayers?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  announceForge?: boolean;

  @ApiPropertyOptional({ description: "-1 turns compression off" })
  @IsOptional()
  @IsInt()
  @Min(-1)
  compressionThreshold?: number;

  @ApiPropertyOptional({ description: "Milliseconds, 0 turns it off" })
  @IsOptional()
  @IsInt()
  @Min(0)
  loginRatelimit?: number;

  @ApiPropertyOptional({ description: "Milliseconds" })
  @IsOptional()
  @IsInt()
  @Min(1)
  connectionTimeout?: number;

  @ApiPropertyOptional({ description: "Milliseconds" })
  @IsOptional()
  @IsInt()
  @Min(1)
  readTimeout?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  haproxyProtocol?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  failoverOnUnexpectedServerDisconnect?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  logPlayerConnections?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acceptsTransfers?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  queryEnabled?: boolean;
}

export class NetworkWizardDto implements NetworkWizardProps {
  @ApiProperty({ example: "Survival network" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name!: string;

  @ApiPropertyOptional({ description: "Existing Velocity server" })
  @IsOptional()
  @IsString()
  proxyServerId?: string;

  @ApiPropertyOptional({ type: NewProxyDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NewProxyDto)
  newProxy?: NewProxyDto;

  @ApiProperty({ type: [String], description: "Existing servers to link" })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  backendIds!: string[];

  @ApiPropertyOptional({ type: [NewBackendDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => NewBackendDto)
  newBackends?: NewBackendDto[];

  @ApiPropertyOptional({ enum: MODES, description: "Detected when omitted" })
  @IsOptional()
  @IsIn(MODES)
  forwardingMode?: ForwardingMode;

  @ApiProperty({
    type: [String],
    description: 'Server ids or "new:<index>", the first is the default',
  })
  @IsArray()
  @ArrayMaxSize(60)
  @IsString({ each: true })
  tryOrder!: string[];

  @ApiPropertyOptional({ type: VelocitySettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VelocitySettingsDto)
  proxySettings?: VelocitySettingsDto;
}

export class AddNetworkMemberDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  serverId!: string;
}

export class NetworkOrderDto {
  @ApiProperty({
    type: [String],
    description: "Member ids, the first is the default",
  })
  @IsArray()
  @ArrayMaxSize(60)
  @IsString({ each: true })
  order!: string[];
}
