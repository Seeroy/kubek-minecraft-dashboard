import { SEARCH_INDEXES } from "@/modules/plugins/dto/search-plugins.dto";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class SearchModpacksDto {
  @ApiPropertyOptional({ description: "Free text query" })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: "Only packs for this Minecraft version" })
  @IsOptional()
  @IsString()
  gameVersion?: string;

  @ApiPropertyOptional({ enum: SEARCH_INDEXES })
  @IsOptional()
  @IsIn(SEARCH_INDEXES)
  index?: (typeof SEARCH_INDEXES)[number];
}
