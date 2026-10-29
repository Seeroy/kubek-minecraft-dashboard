import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import {
  type BackupJournalEntry,
  BackupJournalOp,
  type BackupTrigger,
} from "@shared/types/backup.types";

export class BackupJournalQueryDto {
  @ApiProperty({ required: false, default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;

  @ApiProperty({
    required: false,
    description: "createdAt of the last entry of the previous page",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  before?: number;

  @ApiProperty({
    required: false,
    description: "id of the last entry of the previous page",
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  beforeId?: string;
}

export class BackupJournalEntryDto implements BackupJournalEntry {
  @ApiProperty() id: string;
  @ApiProperty() serverId: string;
  @ApiProperty({ type: String, nullable: true }) backupId: string | null;
  @ApiProperty({ type: String, nullable: true }) backupName: string | null;
  @ApiProperty({ type: String, nullable: true }) storageId: string | null;
  @ApiProperty({ enum: BackupJournalOp }) op: BackupJournalOp;
  @ApiProperty({ enum: ["success", "failed"] }) status: "success" | "failed";
  @ApiProperty({ type: String, nullable: true }) message: string | null;
  @ApiProperty({ type: Number, nullable: true }) bytes: number | null;
  @ApiProperty({ type: Number, nullable: true }) durationMs: number | null;
  @ApiProperty({ enum: ["user", "scheduler", "system"] })
  trigger: BackupTrigger;
  @ApiProperty({ type: String, nullable: true, description: "Who started it" })
  userId: string | null;
  @ApiProperty({ type: String, nullable: true }) username: string | null;
  @ApiProperty() createdAt: number;
}
