import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import {
  BackupFormat,
  BackupType,
  SelectionMode,
  type BackupFile,
  type CreateBackupRequest,
} from "@shared/types/backup.types";

export class BackupFileDto implements BackupFile {
  @ApiProperty({
    description: "File name (no path separators)",
    example: "server.properties",
  })
  @IsString()
  @Matches(/^[^/\\]*$/, {
    message: "File name cannot contain path separators",
  })
  name: string;

  @ApiProperty({
    description: "Path relative to the server root",
    example: "config/server.properties",
  })
  @IsString()
  @Matches(/^[a-zA-Z0-9._\-\s/\\]+$/, {
    message: "Path contains invalid characters",
  })
  path: string;

  @ApiPropertyOptional({ description: "Whether the file is selected" })
  @IsOptional()
  selected?: boolean;
}

export class CreateBackupDto implements CreateBackupRequest {
  @ApiProperty({ description: "Backup name", example: "daily-2026-06-04" })
  @IsString()
  @Matches(/^[a-zA-Z0-9._\-\s]+$/, {
    message: "Backup name contains invalid characters",
  })
  name: string;

  @ApiPropertyOptional({ description: "Optional description" })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9._\-\s]*$/, {
    message: "Description contains invalid characters",
  })
  description?: string;

  @ApiProperty({ enum: BackupType, description: "Backup type" })
  @IsEnum(BackupType)
  type: BackupType;

  @ApiPropertyOptional({
    type: [BackupFileDto],
    description: "Explicitly selected files (custom selection)",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BackupFileDto)
  @ArrayMaxSize(1000, {
    message: "Maximum 1000 files can be selected for backup",
  })
  selectedFiles?: BackupFileDto[];

  @ApiProperty({ description: "Owner server id", example: "srv_001" })
  @IsString()
  serverId: string;

  @ApiPropertyOptional({
    description: "Compression ratio (1-9)",
    minimum: 1,
    maximum: 9,
    example: 6,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(9)
  compressionRatio?: number;

  @ApiPropertyOptional({ enum: BackupFormat, description: "Archive format" })
  @IsOptional()
  @IsEnum(BackupFormat)
  format?: BackupFormat;

  @ApiPropertyOptional({
    enum: SelectionMode,
    description: "File selection mode",
  })
  @IsOptional()
  @IsEnum(SelectionMode)
  selectionMode?: SelectionMode;

  @ApiPropertyOptional({
    type: [String],
    description:
      "Glob patterns to leave out, relative to the server folder (e.g. *.log, cache/**)",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  // Patterns are only matched against paths, still no escaping the server folder
  @Matches(/^(?!\/)(?!.*\.\.)[^\\<>|]+$/, {
    each: true,
    message: "Exclusion patterns must be relative and cannot contain ..",
  })
  @ArrayMaxSize(50, { message: "Maximum 50 glob exception patterns allowed" })
  globExceptions?: string[];
}
