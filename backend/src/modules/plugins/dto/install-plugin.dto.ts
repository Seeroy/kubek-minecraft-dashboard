import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PluginInstallDependencyInput } from "@shared/types/plugins/server-plugin.types";
import { Transform } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export class InstallPluginDependencyDto implements PluginInstallDependencyInput {
  @ApiProperty({ description: "Modrinth project id of the dependency" })
  @IsString()
  projectId!: string;

  @ApiProperty({ description: "Modrinth version id of the dependency" })
  @IsString()
  versionId!: string;
}

export class InstallPluginDto {
  @ApiProperty({ description: "Target server id" })
  @IsString()
  serverId!: string;

  @ApiProperty({ description: "Modrinth project id" })
  @IsString()
  projectId!: string;

  @ApiProperty({ description: "Modrinth version id" })
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

  @ApiPropertyOptional({
    description: "Whether to auto-install required dependencies",
  })
  @IsOptional()
  @IsBoolean()
  installDependencies?: boolean;
}
