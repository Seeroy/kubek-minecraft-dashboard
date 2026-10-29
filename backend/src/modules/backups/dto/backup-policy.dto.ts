import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import type {
  BackupPolicy,
  BackupUploadMode,
  RetentionLimits,
  RetentionPreview,
  ServerBackupPolicy,
} from "@shared/types/backup.types";

export class RetentionLimitsDto implements RetentionLimits {
  @ApiProperty({
    type: Number,
    nullable: true,
    description: "Copies to keep, null for no limit",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  keepCount: number | null = null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: "Days to keep, null for no limit",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  keepDays: number | null = null;
}

export class RemotePolicyDto extends RetentionLimitsDto {
  @ApiProperty({
    type: String,
    nullable: true,
    description: "Storage for uploads, null for none",
  })
  @IsOptional()
  @IsUUID()
  storageId: string | null = null;

  @ApiProperty({ enum: ["auto", "manual"] })
  @IsIn(["auto", "manual"])
  uploadMode: BackupUploadMode;

  @ApiProperty({
    description: "Remove the local archive after a successful upload",
  })
  @IsBoolean()
  deleteLocalAfterUpload: boolean;
}

export class BackupPolicyDto implements BackupPolicy {
  @ApiProperty({ type: RetentionLimitsDto })
  @ValidateNested()
  @Type(() => RetentionLimitsDto)
  local: RetentionLimitsDto;

  @ApiProperty({ type: RemotePolicyDto })
  @ValidateNested()
  @Type(() => RemotePolicyDto)
  remote: RemotePolicyDto;
}

export class UpdateServerPolicyDto {
  @ApiProperty({
    type: BackupPolicyDto,
    nullable: true,
    description: "null resets to the panel defaults",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BackupPolicyDto)
  policy: BackupPolicyDto | null = null;
}

export class RetentionPreviewDto implements RetentionPreview {
  @ApiProperty({ description: "Local copies that would be deleted" })
  local: number;
  @ApiProperty({ description: "Remote copies that would be deleted" })
  remote: number;
}

export class ServerBackupPolicyDto
  extends BackupPolicyDto
  implements ServerBackupPolicy
{
  @ApiProperty() serverId: string;
  @ApiProperty({ description: "False while the panel defaults apply" })
  custom: boolean;
}
