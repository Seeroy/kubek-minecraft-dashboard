import { ApiProperty } from "@nestjs/swagger";
import {
  BackupFileDto,
  BackupFormat,
  BackupType,
  SelectionMode,
} from "./create-backup.dto";

export enum BackupStatus {
  CREATING = "creating",
  COMPLETED = "completed",
  FAILED = "failed",
  PAUSED = "paused",
}

export class BackupEntity {
  @ApiProperty({ description: "Backup ID", example: "bkp_001" })
  id: string;

  @ApiProperty({ description: "Backup name", example: "daily-2026-06-04" })
  name: string;

  @ApiProperty({ description: "Optional description", required: false })
  description?: string;

  @ApiProperty({ description: "Backup type", enum: BackupType })
  type: BackupType;

  @ApiProperty({ description: "Backup status", enum: BackupStatus })
  status: BackupStatus;

  @ApiProperty({ description: "Progress percentage (0–100)", example: 100 })
  progress: number;

  @ApiProperty({
    description: "Creation timestamp (ms)",
    example: 1730143271101,
  })
  createdAt: number;

  @ApiProperty({
    description: "Last update timestamp (ms)",
    example: 1730143275123,
  })
  updatedAt: number;

  @ApiProperty({ description: "Number of files in the backup", example: 42 })
  fileCount: number;

  @ApiProperty({ description: "Total size in bytes", example: 10485760 })
  totalSize: number;

  @ApiProperty({
    description: "Explicitly selected files",
    type: [BackupFileDto],
    required: false,
  })
  selectedFiles?: BackupFileDto[];

  @ApiProperty({ description: "Owner server ID", example: "srv_001" })
  serverId: string;

  @ApiProperty({
    description: "Path to the backup file/directory",
    required: false,
  })
  path?: string;

  @ApiProperty({ description: "Owner user ID", required: false })
  ownerId?: string;

  @ApiProperty({
    description: "Compression ratio",
    required: false,
    example: 0.62,
  })
  compressionRatio?: number;

  @ApiProperty({
    description: "Backup archive format",
    enum: BackupFormat,
    required: false,
  })
  format?: BackupFormat;

  @ApiProperty({
    description: "File selection mode",
    enum: SelectionMode,
    required: false,
  })
  selectionMode?: SelectionMode;

  @ApiProperty({
    description: "Glob patterns excluded from the backup",
    type: [String],
    required: false,
  })
  globExceptions?: string[];
}
