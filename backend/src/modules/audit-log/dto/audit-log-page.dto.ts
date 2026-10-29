import { ApiProperty } from "@nestjs/swagger";
import {
  AUDIT_SOURCES,
  AuditCategory,
  AuditResult,
  type AuditSource,
  type AuditChange,
  type AuditLogPage,
  type IAuditLog,
} from "@shared/types/audit.types";

// A logged value is whatever the edited field held
const ANY_VALUE = {
  required: false,
  nullable: true,
  oneOf: [
    { type: "string" },
    { type: "number" },
    { type: "boolean" },
    { type: "array", items: {} },
    { type: "object", additionalProperties: true },
  ],
};

/** One changed field of an edited object */
export class AuditChangeDto implements AuditChange {
  @ApiProperty({
    description: "Dotted path of the field",
    example: "ftpd.port",
  })
  field: string;

  @ApiProperty({ ...ANY_VALUE, description: "Value before the change" })
  from?: unknown;

  @ApiProperty({ ...ANY_VALUE, description: "Value after the change" })
  to?: unknown;

  @ApiProperty({
    required: false,
    description: "A secret changed, its values are never logged",
  })
  secret?: boolean;

  @ApiProperty({ required: false, description: "Display name of the field" })
  label?: string;
}

/** A single audit log entry */
export class AuditLogEntryDto implements IAuditLog {
  @ApiProperty({ description: "Entry id" })
  id: string;

  @ApiProperty({
    nullable: true,
    description: "Actor user id; null when anonymous or deleted",
  })
  userId: string | null;

  @ApiProperty({ description: "Actor username snapshot" })
  username: string;

  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
    description: "Actor's current avatar nickname, null when unset or deleted",
  })
  skinName?: string | null;

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
    type: String,
    description: "Server the action touched",
  })
  serverId?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
    description: "Server name when the action happened",
  })
  serverName?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    type: [AuditChangeDto],
    description: "Fields changed by the action",
  })
  changes?: AuditChangeDto[] | null;

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
    enum: AUDIT_SOURCES,
    description: "Source of the action",
  })
  source: AuditSource;

  @ApiProperty({ description: "Creation timestamp (ms epoch)" })
  createdAt: number;
}

/** Paginated audit log query result */
export class AuditLogPageDto implements AuditLogPage {
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
