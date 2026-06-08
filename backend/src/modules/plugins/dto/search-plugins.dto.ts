import { Transform } from "class-transformer";
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class SearchPluginsDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  gameVersion?: string;

  @IsOptional()
  @IsString()
  loader?: string;

  @IsOptional()
  @IsString()
  environment?: "server" | "client" | "both";

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
      } catch {
        return [String(value)];
      }
    }
    return [String(value)];
  })
  categories?: string[];
}

export class ProjectVersionsQueryDto {
  @IsOptional()
  @IsString()
  gameVersion?: string;

  @IsOptional()
  @IsString()
  loader?: string;
}
