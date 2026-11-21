import { ApiProperty } from "@nestjs/swagger";
import {
  AUDIT_SOURCES,
  AuditCategory,
  AuditResult,
  type AuditSource,
} from "@shared/types/audit.types";
import { AUDIT_EXPORT_FORMATS, type AuditExportFormat } from "../audit-export";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

// Not OmitType, in the built binary it lost the validators and rejected every filter
export class AuditLogFiltersDto {
  @ApiProperty({ required: false, enum: AuditCategory })
  @IsOptional()
  @IsEnum(AuditCategory)
  category?: AuditCategory;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ required: false, description: "Entries about one server" })
  @IsOptional()
  @IsString()
  serverId?: string;

  @ApiProperty({ required: false, enum: AuditResult })
  @IsOptional()
  @IsEnum(AuditResult)
  result?: AuditResult;

  @ApiProperty({ required: false, enum: AUDIT_SOURCES })
  @IsOptional()
  @IsIn(AUDIT_SOURCES)
  source?: AuditSource;

  @ApiProperty({
    required: false,
    description: "Entries made with one API key",
  })
  @IsOptional()
  @IsString()
  apiKeyId?: string;

  @ApiProperty({
    required: false,
    description: "Matches username, resource name, action or key name",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    required: false,
    description: "Inclusive createdAt lower bound (ms epoch)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  from?: number;

  @ApiProperty({
    required: false,
    description: "Inclusive createdAt upper bound (ms epoch)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  to?: number;
}

export class QueryAuditLogsDto extends AuditLogFiltersDto {
  @ApiProperty({ required: false, default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiProperty({ required: false, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

export class ExportAuditLogsDto extends AuditLogFiltersDto {
  @ApiProperty({ required: false, enum: AUDIT_EXPORT_FORMATS, default: "json" })
  @IsOptional()
  @IsIn(AUDIT_EXPORT_FORMATS)
  format?: AuditExportFormat = "json";
}
