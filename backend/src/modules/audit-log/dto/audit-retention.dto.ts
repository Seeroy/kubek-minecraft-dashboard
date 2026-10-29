import { ApiProperty } from "@nestjs/swagger";
import type {
  AuditRetention,
  AuditRetentionState,
} from "@shared/types/audit.types";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class AuditRetentionDto implements AuditRetention {
  @ApiProperty({
    type: Number,
    nullable: true,
    description: "Days an entry is kept, null for no limit",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  keepDays: number | null = null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: "Newest entries kept, null for no limit",
  })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(10_000_000)
  maxEntries: number | null = null;
}

export class AuditRetentionStateDto implements AuditRetentionState {
  @ApiProperty({ type: AuditRetentionDto })
  retention: AuditRetentionDto;

  @ApiProperty({ description: "Entries in the log right now" })
  total: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: "Creation time of the oldest entry (ms epoch)",
  })
  oldestAt: number | null;
}

export class AuditRetentionPreviewDto {
  @ApiProperty({ description: "Entries the draft would remove now" })
  removed: number;
}
