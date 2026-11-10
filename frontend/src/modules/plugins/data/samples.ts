import type { InstalledPluginView, ModrinthSearchHit, ModrinthVersion } from "@shared/types/plugins";

const item = (
  i: number,
  title: string,
  versionNumber: string
): InstalledPluginView => ({
  id: `sample-${i}`,
  serverId: "sample",
  projectId: `sample-${i}`,
  versionId: `sample-${i}`,
  fileName: `${title}-${versionNumber}.jar`,
  installedAt: 0,
  type: "modrinth",
  hasUpdate: false,
  // No iconUrl, the skeleton should not fetch icons
  metadata: {
    id: `sample-${i}`,
    slug: title.toLowerCase(),
    title,
    description: "Adds commands and tools for server admins",
    projectType: "plugin",
    downloads: 0,
    serverSide: "required",
    clientSide: "unsupported",
    categories: [],
    displayCategories: [],
    latestVersionIds: [],
  },
  version: {
    id: `sample-${i}`,
    name: versionNumber,
    versionNumber,
    publishedAt: "",
    loaders: [],
    gameVersions: [],
    downloads: 0,
    files: [],
    dependencies: [],
  },
});

export const SAMPLE_INSTALLED: InstalledPluginView[] = [
  item(1, "EssentialsX", "2.21.0"),
  item(2, "LuckPerms", "5.4.141"),
  item(3, "WorldEdit", "7.3.6"),
  item(4, "Vault", "1.7.3"),
];

const TITLES = ["EssentialsX", "LuckPerms", "WorldEdit", "Vault", "CoreProtect", "ViaVersion", "Chunky", "Multiverse-Core", "PlaceholderAPI", "Geyser", "DiscordSRV", "GriefPrevention"];

// One catalog page, no icon_url so the skeleton fetches no images
export const SAMPLE_CATALOG: ModrinthSearchHit[] = TITLES.map((title, i) => ({
  project_id: `sample-${i}`,
  slug: title.toLowerCase(),
  author: "sample-author",
  title,
  description: "Adds commands and tools for server admins, works with most cores",
  downloads: 1_250_000,
  follows: 4_200,
  project_type: "plugin",
  versions: ["1.21.4"],
  categories: ["utility"],
  display_categories: ["utility", "management"],
  client_side: "unsupported",
  server_side: "required",
  date_modified: "2026-01-01T00:00:00Z",
}));

const version = (i: number, versionNumber: string, type: ModrinthVersion["version_type"]): ModrinthVersion => ({
  id: `sample-version-${i}`,
  project_id: "sample",
  author_id: "sample",
  featured: false,
  name: versionNumber,
  version_number: versionNumber,
  date_published: "2026-01-01T00:00:00Z",
  downloads: 48_000,
  version_type: type,
  files: [],
  dependencies: [],
  game_versions: ["1.21.4"],
  loaders: ["paper"],
});

export const SAMPLE_VERSIONS: ModrinthVersion[] = [version(1, "2.21.0", "release"), version(2, "2.20.1", "release"), version(3, "2.20.0-beta.2", "beta")];

export const SAMPLE_PROJECT_ICON = { title: "Sample project", icon_url: undefined as string | undefined, categories: [] as string[] };
