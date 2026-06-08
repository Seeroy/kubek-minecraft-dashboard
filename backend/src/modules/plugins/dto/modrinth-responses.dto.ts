import { ApiProperty } from "@nestjs/swagger";

/** A single search hit returned by the Modrinth /search endpoint */
export class ModrinthSearchHitDto {
  @ApiProperty({ description: "Modrinth project id", example: "AABBCCDD" })
  project_id: string;

  @ApiProperty({ description: "Project slug", example: "luckperms" })
  slug: string;

  @ApiProperty({ description: "Author username", example: "lucko" })
  author: string;

  @ApiProperty({ description: "Project title", example: "LuckPerms" })
  title: string;

  @ApiProperty({ description: "Short description" })
  description: string;

  @ApiProperty({ description: "Total downloads", example: 1234567 })
  downloads: number;

  @ApiProperty({ description: "Follower count", example: 4321 })
  follows: number;

  @ApiProperty({ required: false, description: "Icon URL" })
  icon_url?: string;

  @ApiProperty({ description: "Project type", example: "plugin" })
  project_type: string;

  @ApiProperty({ type: [String], description: "Version ids" })
  versions: string[];

  @ApiProperty({ type: [String], description: "Categories" })
  categories: string[];

  @ApiProperty({ type: [String], description: "Display categories" })
  display_categories: string[];

  @ApiProperty({
    enum: ["required", "optional", "unsupported", "unknown"],
    description: "Client-side support",
  })
  client_side: "required" | "optional" | "unsupported" | "unknown";

  @ApiProperty({
    enum: ["required", "optional", "unsupported", "unknown"],
    description: "Server-side support",
  })
  server_side: "required" | "optional" | "unsupported" | "unknown";

  @ApiProperty({ required: false, description: "Project accent colour" })
  colour?: number;

  @ApiProperty({ required: false, description: "Latest version id" })
  latest_version?: string;

  @ApiProperty({ required: false, description: "First publish date" })
  date_published?: string;

  @ApiProperty({ required: false, description: "Last modification date" })
  date_modified?: string;

  @ApiProperty({
    required: false,
    type: [String],
    description: "Gallery image URLs",
  })
  gallery?: string[];
}

/** Paginated Modrinth search response */
export class ModrinthSearchResponseDto {
  @ApiProperty({ type: [ModrinthSearchHitDto], description: "Search hits" })
  hits: ModrinthSearchHitDto[];

  @ApiProperty({ description: "Offset of the first hit", example: 0 })
  offset: number;

  @ApiProperty({ description: "Page size", example: 20 })
  limit: number;

  @ApiProperty({ description: "Total number of matches", example: 153 })
  total_hits: number;
}

/** A funding/donation link declared on a Modrinth project */
export class ModrinthDonationUrlDto {
  @ApiProperty({ description: "Donation platform id" })
  id: string;

  @ApiProperty({ description: "Donation platform name" })
  platform: string;

  @ApiProperty({ description: "Donation URL" })
  url: string;
}

/** Full Modrinth project details */
export class ModrinthProjectDto {
  @ApiProperty({ description: "Project id" })
  id: string;

  @ApiProperty({ description: "Project slug" })
  slug: string;

  @ApiProperty({ description: "Project type", example: "plugin" })
  project_type: string;

  @ApiProperty({ description: "Team id" })
  team: string;

  @ApiProperty({ description: "Project title" })
  title: string;

  @ApiProperty({ description: "Short description" })
  description: string;

  @ApiProperty({ description: "Long body (markdown)" })
  body: string;

  @ApiProperty({ type: [String], description: "Categories" })
  categories: string[];

  @ApiProperty({ type: [String], description: "Additional categories" })
  additional_categories: string[];

  @ApiProperty({ type: [String], description: "Version ids" })
  versions: string[];

  @ApiProperty({ type: [String], description: "Supported game versions" })
  game_versions: string[];

  @ApiProperty({ type: [String], description: "Supported loaders" })
  loaders: string[];

  @ApiProperty({ required: false, description: "Icon URL" })
  icon_url?: string;

  @ApiProperty({ required: false, description: "Issue tracker URL" })
  issues_url?: string;

  @ApiProperty({ required: false, description: "Source code URL" })
  source_url?: string;

  @ApiProperty({ required: false, description: "Wiki URL" })
  wiki_url?: string;

  @ApiProperty({ required: false, description: "Discord URL" })
  discord_url?: string;

  @ApiProperty({
    required: false,
    type: [ModrinthDonationUrlDto],
    description: "Donation links",
  })
  donation_urls?: ModrinthDonationUrlDto[];

  @ApiProperty({ required: false, description: "Project accent colour" })
  color?: number;

  @ApiProperty({ description: "Total downloads" })
  downloads: number;

  @ApiProperty({ description: "Follower count" })
  followers: number;

  @ApiProperty({ description: "First publish date" })
  published: string;

  @ApiProperty({ description: "Last update date" })
  updated: string;

  @ApiProperty({
    enum: ["required", "optional", "unsupported", "unknown"],
    description: "Server-side support",
  })
  server_side: "required" | "optional" | "unsupported" | "unknown";

  @ApiProperty({
    enum: ["required", "optional", "unsupported", "unknown"],
    description: "Client-side support",
  })
  client_side: "required" | "optional" | "unsupported" | "unknown";
}

/** A downloadable file artifact within a Modrinth version */
export class ModrinthVersionFileDto {
  @ApiProperty({ description: "File name" })
  filename: string;

  @ApiProperty({
    description: "Whether this is the primary artifact",
    example: true,
  })
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

  @ApiProperty({ required: false, description: "Alternative file type field" })
  file_type?: string;

  @ApiProperty({ required: false, description: "File size in bytes" })
  size?: number;
}

/** A dependency declared by a Modrinth version */
export class ModrinthVersionDependencyDto {
  @ApiProperty({ required: false, description: "Dependency project id" })
  project_id?: string;

  @ApiProperty({ required: false, description: "Dependency version id" })
  version_id?: string;

  @ApiProperty({
    enum: ["required", "optional", "incompatible", "embedded"],
    description: "Dependency relation",
  })
  dependencyType: "required" | "optional" | "incompatible" | "embedded";

  @ApiProperty({ required: false, description: "Bundled file name" })
  fileName?: string;
}

/** Full Modrinth version details */
export class ModrinthVersionDto {
  @ApiProperty({ description: "Version id" })
  id: string;

  @ApiProperty({ description: "Owning project id" })
  project_id: string;

  @ApiProperty({ description: "Author id" })
  author_id: string;

  @ApiProperty({
    description: "Whether the version is featured",
    example: false,
  })
  featured: boolean;

  @ApiProperty({ description: "Version display name" })
  name: string;

  @ApiProperty({ description: "Version number", example: "5.4.102" })
  version_number: string;

  @ApiProperty({ required: false, description: "Changelog (markdown)" })
  changelog?: string;

  @ApiProperty({ required: false, description: "Changelog URL" })
  changelog_url?: string;

  @ApiProperty({ description: "Publish date" })
  date_published: string;

  @ApiProperty({ description: "Download count" })
  downloads: number;

  @ApiProperty({
    enum: ["release", "beta", "alpha"],
    description: "Release channel",
  })
  version_type: "release" | "beta" | "alpha";

  @ApiProperty({
    type: [ModrinthVersionFileDto],
    description: "Downloadable files",
  })
  files: ModrinthVersionFileDto[];

  @ApiProperty({
    type: [ModrinthVersionDependencyDto],
    description: "Declared dependencies",
  })
  dependencies: ModrinthVersionDependencyDto[];

  @ApiProperty({ type: [String], description: "Supported game versions" })
  game_versions: string[];

  @ApiProperty({ type: [String], description: "Supported loaders" })
  loaders: string[];
}
