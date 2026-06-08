import { ApiProperty } from "@nestjs/swagger";
import { AuditCategory, AuditResult } from "@shared/types/audit.types";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class QueryAuditLogsDto {
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

  @ApiProperty({ required: false, enum: AuditResult })
  @IsOptional()
  @IsEnum(AuditResult)
  result?: AuditResult;

  @ApiProperty({
    required: false,
    description: "Matches username, resource name or action",
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
