import { ApiProperty } from "@nestjs/swagger";
import {
  type Backup,
  type BackupCopy,
  BackupCopyStatus,
  BackupFormat,
  BackupStatus,
  BackupType,
  SelectionMode,
} from "@shared/types/backup.types";
import { BackupFileDto } from "./create-backup.dto";

/** One stored archive of a backup */
export class BackupCopyDto implements BackupCopy {
  @ApiProperty() id: string;
  @ApiProperty() backupId: string;
  @ApiProperty({
    type: String,
    nullable: true,
    description: "Remote storage id, null for the panel disk",
  })
  storageId: string | null;
  @ApiProperty({ description: "Archive size in bytes" }) size: number;
  @ApiProperty({ enum: BackupCopyStatus }) status: BackupCopyStatus;
  @ApiProperty({ type: String, nullable: true }) error: string | null;
  @ApiProperty() createdAt: number;
  @ApiProperty() updatedAt: number;
}

export class BackupEntity implements Backup {
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

  @ApiProperty({ description: "Owner user ID", required: false })
  ownerId?: string;

  @ApiProperty({
    description: "Compression level 1-9",
    required: false,
    example: 6,
  })
  compressionRatio?: number;

  @ApiProperty({ description: "Backup archive format", enum: BackupFormat })
  format: BackupFormat;

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

  @ApiProperty({ description: "Pinned backups are kept by retention" })
  pinned: boolean;

  @ApiProperty({ description: "sha256 of the archive", required: false })
  checksum?: string;

  @ApiProperty({ type: [BackupCopyDto], description: "Stored archives" })
  copies: BackupCopyDto[];
}
