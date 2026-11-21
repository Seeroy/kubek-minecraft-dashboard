import { ApiProperty } from "@nestjs/swagger";
import type { CatalogSource } from "@shared/types/catalog.types";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

export class CatalogQueryDto {
  @ApiProperty({
    required: false,
    description: "Skip the 10 minute cache and download the index again",
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true" || value === "1")
  @IsBoolean()
  refresh?: boolean;
}

export class CatalogDownloadDto {
  @ApiProperty()
  url: string;

  @ApiProperty()
  sha256: string;

  @ApiProperty({ description: "Package size in bytes" })
  size: number;
}

export class CatalogBlockedDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  reason: string;
}

class CatalogEnginesDto {
  @ApiProperty({ example: ">=4.2.0" })
  kubek: string;
}

class CatalogItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  version: string;

  @ApiProperty()
  author: string;

  @ApiProperty({ nullable: true, type: String })
  authorUrl: string | null;

  @ApiProperty({ type: CatalogEnginesDto })
  engines: CatalogEnginesDto;

  @ApiProperty({ nullable: true, type: String, description: "Png url" })
  icon: string | null;

  @ApiProperty({ nullable: true, type: String, description: "Emoji icon" })
  iconText: string | null;

  @ApiProperty({ enum: ["official", "community"] })
  source: CatalogSource;

  @ApiProperty({ description: "owner/name on GitHub" })
  repo: string;

  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
    description: "Reviewed commit the community package is built from",
  })
  commit?: string | null;

  @ApiProperty({ nullable: true, type: String })
  homepage: string | null;

  @ApiProperty({ nullable: true, type: String })
  license: string | null;

  @ApiProperty({ type: CatalogDownloadDto })
  download: CatalogDownloadDto;

  @ApiProperty({ nullable: true, type: String, description: "ISO date" })
  updatedAt: string | null;

  @ApiProperty({ description: "engines.kubek matches this panel" })
  compatible: boolean;

  @ApiProperty({ nullable: true, type: String })
  installedVersion: string | null;

  @ApiProperty()
  updateAvailable: boolean;

  @ApiProperty({ description: "Ships with the panel and can't be replaced" })
  builtIn: boolean;
}

export class CatalogBlueprintDto extends CatalogItemDto {
  @ApiProperty({ nullable: true, type: String })
  shortName: string | null;

  @ApiProperty()
  game: string;

  @ApiProperty({ nullable: true, type: String })
  gameName: string | null;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty({ nullable: true, type: [String] })
  platforms: string[] | null;

  @ApiProperty({ enum: ["native", "docker"] })
  runtime: "native" | "docker";

  @ApiProperty({ type: [String], description: "Install step types it uses" })
  installSteps: string[];
}

export class CatalogExtensionDto extends CatalogItemDto {
  @ApiProperty({ type: [String] })
  keywords: string[];

  @ApiProperty({ type: [String] })
  capabilities: string[];

  @ApiProperty()
  hasBackend: boolean;

  @ApiProperty()
  hasFrontend: boolean;
}

class CatalogResponseDto {
  @ApiProperty({ type: [CatalogBlockedDto] })
  blocked: CatalogBlockedDto[];

  @ApiProperty({ description: "ISO date the index was built" })
  generatedAt: string;

  @ApiProperty({ description: "When the panel downloaded it (ms epoch)" })
  fetchedAt: number;

  @ApiProperty({ description: "GitHub didn't answer, this is an old copy" })
  stale: boolean;
}

export class CatalogBlueprintsResponseDto extends CatalogResponseDto {
  @ApiProperty({ type: [CatalogBlueprintDto] })
  items: CatalogBlueprintDto[];
}

export class CatalogExtensionsResponseDto extends CatalogResponseDto {
  @ApiProperty({ type: [CatalogExtensionDto] })
  items: CatalogExtensionDto[];
}
