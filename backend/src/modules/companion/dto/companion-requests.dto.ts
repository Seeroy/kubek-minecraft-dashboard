import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import type { CompanionEventType } from "@shared/types/companion.types";
import { COMPANION_EVENT_TYPES } from "./companion-responses.dto";

export type CompanionMetricsWindow = "1h" | "6h" | "24h" | "7d";
export const COMPANION_WINDOWS: CompanionMetricsWindow[] = [
  "1h",
  "6h",
  "24h",
  "7d",
];

export class UpdateCompanionSettingsDto {
  @ApiPropertyOptional({
    description: "Log joins and quits to the activity feed",
  })
  @IsOptional()
  @IsBoolean()
  sessions?: boolean;

  @ApiPropertyOptional({ description: "Log kicks to the activity feed" })
  @IsOptional()
  @IsBoolean()
  kicks?: boolean;

  @ApiPropertyOptional({ description: "Log deaths to the activity feed" })
  @IsOptional()
  @IsBoolean()
  deaths?: boolean;

  @ApiPropertyOptional({ description: "Log chat to the activity feed" })
  @IsOptional()
  @IsBoolean()
  chat?: boolean;

  @ApiPropertyOptional({ description: "Send player coordinates with stats" })
  @IsOptional()
  @IsBoolean()
  coords?: boolean;
}

export class CompanionBroadcastDto {
  @ApiProperty({ description: "Chat message, & color codes", maxLength: 512 })
  @IsString()
  @MaxLength(512)
  message!: string;
}

export class CompanionTitleDto {
  @ApiProperty({ maxLength: 128 })
  @IsString()
  @MaxLength(128)
  title!: string;

  @ApiPropertyOptional({ maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  subtitle?: string;

  @ApiPropertyOptional({
    description: "Seconds on screen",
    minimum: 1,
    maximum: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  seconds?: number;
}

export class CompanionMaintenanceRequestDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({
    description: "Kick message, & color codes",
    maxLength: 256,
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  message?: string;

  @ApiPropertyOptional({
    description: "Server list MOTD while it's on",
    maxLength: 256,
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  motd?: string;

  @ApiPropertyOptional({
    type: [String],
    description: "Names or UUIDs let in anyway",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  allow?: string[];

  @ApiPropertyOptional({
    description: "Operators can still join",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowOps?: boolean;

  @ApiPropertyOptional({
    description: "Kick everyone who isn't allowed right away",
  })
  @IsOptional()
  @IsBoolean()
  kickOnline?: boolean;
}

export class CompanionMetricsQueryDto {
  @ApiProperty({ enum: COMPANION_WINDOWS, enumName: "CompanionMetricsWindow" })
  @IsIn(COMPANION_WINDOWS)
  window!: CompanionMetricsWindow;
}

export class CompanionEventsQueryDto {
  @ApiPropertyOptional({
    enum: COMPANION_EVENT_TYPES,
    enumName: "CompanionEventType",
    isArray: true,
  })
  @IsOptional()
  // ?types=join&types=quit or ?types=join,quit
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === "string" ? value.split(",") : value,
  )
  @IsArray()
  @IsIn(COMPANION_EVENT_TYPES, { each: true })
  types?: CompanionEventType[];

  @ApiPropertyOptional({ description: "Events older than this id" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  before?: number;

  @ApiPropertyOptional({
    description: "Substring of the name, uuid, chat message or kick reason",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class CompanionActivityQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 30, default: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  days?: number;
}

export class CompanionLagReportQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
