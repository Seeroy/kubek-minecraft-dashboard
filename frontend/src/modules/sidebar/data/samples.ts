import type { ModrinthSearchHit, ModrinthVersion } from "@shared/types/plugins";

const pack = (i: number, title: string): ModrinthSearchHit => ({
  project_id: `sample-${i}`,
  slug: `sample-${i}`,
  author: "sample-author",
  title,
  description: "Optimized Fabric pack for a smooth survival server",
  downloads: 2_400_000,
  follows: 9_000,
  project_type: "modpack",
  versions: ["1.21.4"],
  categories: [],
  display_categories: [],
  client_side: "required",
  server_side: "required",
});

export const SAMPLE_MODPACKS: ModrinthSearchHit[] = [pack(1, "Fabulously Optimized"), pack(2, "Better Adventures"), pack(3, "Cobblemon Official"), pack(4, "All of Fabric")];

const version = (i: number, versionNumber: string): ModrinthVersion => ({
  id: `sample-${i}`,
  project_id: "sample",
  author_id: "sample",
  featured: false,
  name: versionNumber,
  version_number: versionNumber,
  date_published: "2026-01-01T00:00:00Z",
  downloads: 0,
  version_type: "release",
  files: [],
  dependencies: [],
  game_versions: ["1.21.3", "1.21.4"],
  loaders: ["fabric"],
});

export const SAMPLE_MODPACK_VERSIONS: ModrinthVersion[] = [version(1, "6.2.0"), version(2, "6.1.3"), version(3, "6.0.1")];
