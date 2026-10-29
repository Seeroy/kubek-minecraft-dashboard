import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  ModpackPreview,
  ModpackSource,
  ModpackWarning,
} from "@shared/types/modpack.types";

export class ModpackWarningDto {
  @ApiProperty({
    enum: [
      "optional_server_files",
      "unknown_env_files",
      "client_overrides_ignored",
    ],
  })
  code!: ModpackWarning["code"];

  @ApiPropertyOptional({ description: "Files the warning is about" })
  count?: number;
}

export class ModpackPreviewDto implements ModpackPreview {
  @ApiProperty({ description: "Staged pack handle for install" })
  packId!: string;

  @ApiProperty({ enum: ["file", "modrinth"] })
  source!: ModpackSource;

  @ApiPropertyOptional()
  projectId?: string;

  @ApiPropertyOptional()
  versionId?: string;

  @ApiPropertyOptional()
  iconUrl?: string;

  @ApiProperty({ example: "Fabric Boosted" })
  name!: string;

  @ApiProperty({ example: "2.1.0" })
  version!: string;

  @ApiPropertyOptional()
  summary?: string;

  @ApiProperty({ example: "1.21.1" })
  minecraftVersion!: string;

  @ApiProperty({ enum: ["fabric"] })
  loader!: "fabric";

  @ApiProperty({ example: "0.16.5" })
  loaderVersion!: string;

  @ApiProperty({ description: "Files downloaded for the server" })
  fileCount!: number;

  @ApiProperty({ description: "Jars among them" })
  modCount!: number;

  @ApiProperty({ description: "Declared download size in bytes" })
  downloadSize!: number;

  @ApiProperty({ description: "Client-only files that are skipped" })
  skippedClientOnly!: number;

  @ApiProperty({ type: [ModpackWarningDto] })
  warnings!: ModpackWarning[];
}
