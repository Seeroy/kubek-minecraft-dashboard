import { ApiProperty } from "@nestjs/swagger";

/** Condensed Modrinth project metadata attached to an installed record */
export class InstalledContentProjectSummaryDto {
  @ApiProperty({ description: "Project id" })
  id: string;

  @ApiProperty({ description: "Project slug" })
  slug: string;

  @ApiProperty({ description: "Project title" })
  title: string;

  @ApiProperty({ description: "Short description" })
  description: string;

  @ApiProperty({ description: "Project type", example: "plugin" })
  projectType: string;

  @ApiProperty({ required: false, description: "Icon URL" })
  iconUrl?: string;

  @ApiProperty({ description: "Total downloads" })
  downloads: number;

  @ApiProperty({
    enum: ["required", "optional", "unsupported", "unknown"],
    description: "Server-side support",
  })
  serverSide: "required" | "optional" | "unsupported" | "unknown";

  @ApiProperty({
    enum: ["required", "optional", "unsupported", "unknown"],
    description: "Client-side support",
  })
  clientSide: "required" | "optional" | "unsupported" | "unknown";

  @ApiProperty({ type: [String], description: "Categories" })
  categories: string[];

  @ApiProperty({ type: [String], description: "Display categories" })
  displayCategories: string[];

  @ApiProperty({ required: false, description: "Project accent colour" })
  color?: number;

  @ApiProperty({ type: [String], description: "Latest version ids" })
  latestVersionIds: string[];
}

/** Downloadable file artifact within a version summary */
export class InstalledContentFileDto {
  @ApiProperty({ description: "File name" })
  filename: string;

  @ApiProperty({ description: "Whether this is the primary artifact" })
  primary: boolean;

  @ApiProperty({ description: "Direct download URL" })
  url: string;

  @ApiProperty({
    description: "File hashes",
    additionalProperties: { type: "string" },
  })
  hashes: Record<string, string | undefined>;

  @ApiProperty({ required: false, description: "File type" })
  fileType?: string;

  @ApiProperty({ required: false, description: "File size in bytes" })
  size?: number;
}

/** Dependency declared by a version summary */
export class InstalledContentDependencyDto {
  @ApiProperty({ required: false, description: "Dependency project id" })
  projectId?: string;

  @ApiProperty({ required: false, description: "Dependency version id" })
  versionId?: string;

  @ApiProperty({
    enum: ["required", "optional", "incompatible", "embedded"],
    description: "Dependency relation",
  })
  dependencyType: "required" | "optional" | "incompatible" | "embedded";

  @ApiProperty({ required: false, description: "Bundled file name" })
  fileName?: string;
}

/** Condensed Modrinth version metadata attached to an installed record */
export class InstalledContentVersionSummaryDto {
  @ApiProperty({ description: "Version id" })
  id: string;

  @ApiProperty({ description: "Version display name" })
  name: string;

  @ApiProperty({ description: "Version number" })
  versionNumber: string;

  @ApiProperty({ required: false, description: "Changelog (markdown)" })
  changelog?: string;

  @ApiProperty({ description: "Publish date" })
  publishedAt: string;

  @ApiProperty({ type: [String], description: "Supported loaders" })
  loaders: string[];

  @ApiProperty({ type: [String], description: "Supported game versions" })
  gameVersions: string[];

  @ApiProperty({ description: "Download count" })
  downloads: number;

  @ApiProperty({ type: [InstalledContentFileDto], description: "Files" })
  files: InstalledContentFileDto[];

  @ApiProperty({
    type: [InstalledContentDependencyDto],
    description: "Dependencies",
  })
  dependencies: InstalledContentDependencyDto[];
}

/** A plugin/mod installed on a server (Modrinth-managed or a manual jar) */
export class InstalledContentDto {
  @ApiProperty({
    description: "Installed record id (or `manual-<file>` for manual jars)",
  })
  id: string;

  @ApiProperty({ description: "Server id" })
  serverId: string;

  @ApiProperty({ description: "Modrinth project id (empty for manual files)" })
  projectId: string;

  @ApiProperty({ description: "Modrinth version id (empty for manual files)" })
  versionId: string;

  @ApiProperty({ description: "Artifact file name" })
  fileName: string;

  @ApiProperty({ required: false, description: "File hash" })
  fileHash?: string;

  @ApiProperty({
    required: false,
    description: "Id of the record this is a dependency of",
  })
  dependencyOf?: string;

  @ApiProperty({ description: "Install timestamp (ms epoch)" })
  installedAt: number;

  @ApiProperty({
    required: false,
    description: "Last update timestamp (ms epoch)",
  })
  updatedAt?: number;

  @ApiProperty({ enum: ["modrinth", "manual"], description: "Install source" })
  type: "modrinth" | "manual";

  @ApiProperty({
    required: false,
    type: InstalledContentProjectSummaryDto,
    description: "Modrinth project metadata",
  })
  metadata?: InstalledContentProjectSummaryDto;

  @ApiProperty({
    required: false,
    type: InstalledContentVersionSummaryDto,
    description: "Installed version metadata",
  })
  version?: InstalledContentVersionSummaryDto;

  @ApiProperty({
    description: "Whether a newer version is available",
    example: false,
  })
  hasUpdate: boolean;

  @ApiProperty({
    required: false,
    type: InstalledContentVersionSummaryDto,
    description: "Latest available version",
  })
  latestVersion?: InstalledContentVersionSummaryDto;
}
