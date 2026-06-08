import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { InstallPluginDependencyDto } from "./install-plugin.dto";

export class UpdatePluginDto {
  @ApiProperty({ description: "Target Modrinth version id to update to" })
  @IsString()
  versionId!: string;

  @ApiPropertyOptional({
    type: [InstallPluginDependencyDto],
    description: "Dependencies to install alongside",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  dependencies?: InstallPluginDependencyDto[];

  @ApiPropertyOptional({ description: "Reinstall even if already up to date" })
  @IsOptional()
  @IsBoolean()
  reinstall?: boolean;
}

export class RemovePluginDto {
  @ApiPropertyOptional({
    description: "Also remove dependants of this content",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  removeDependants?: boolean = true;
}
