import { ApiProperty } from "@nestjs/swagger";
import { AuditCategory, AuditResult } from "@shared/types/audit.types";

/** A single audit log entry */
export class AuditLogEntryDto {
  @ApiProperty({ description: "Entry id" })
  id: string;

  @ApiProperty({
    nullable: true,
    description: "Actor user id; null when anonymous or deleted",
  })
  userId: string | null;

  @ApiProperty({ description: "Actor username snapshot" })
  username: string;

  @ApiProperty({ description: "Action identifier", example: "server.start" })
  action: string;

  @ApiProperty({ enum: AuditCategory, description: "Action category" })
  category: AuditCategory;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Affected resource type",
  })
  resourceType?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Affected resource id",
  })
  resourceId?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Affected resource name",
  })
  resourceName?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    type: Object,
    additionalProperties: true,
    description: "Extra structured details",
  })
  details?: Record<string, unknown> | null;

  @ApiProperty({ enum: AuditResult, description: "Outcome of the action" })
  result: AuditResult;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Error message when failed",
  })
  error?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Actor IP address",
  })
  ip?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Actor user agent",
  })
  userAgent?: string | null;

  @ApiProperty({
    enum: ["panel", "telegram", "system"],
    description: "Source of the action",
  })
  source: "panel" | "telegram" | "system";

  @ApiProperty({ description: "Creation timestamp (ms epoch)" })
  createdAt: number;
}

/** Paginated audit log query result */
export class AuditLogPageDto {
  @ApiProperty({
    type: [AuditLogEntryDto],
    description: "Audit log entries for the page",
  })
  items: AuditLogEntryDto[];

  @ApiProperty({ description: "Total entries matching the filter" })
  total: number;

  @ApiProperty({ description: "Page size", example: 50 })
  limit: number;

  @ApiProperty({ description: "Offset of the first entry", example: 0 })
  offset: number;
}
