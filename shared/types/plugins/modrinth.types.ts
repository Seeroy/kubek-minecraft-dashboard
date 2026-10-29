export interface ModrinthSearchResponse {
  hits: ModrinthSearchHit[];
  offset: number;
  limit: number;
  total_hits: number;
}

export interface ModrinthSearchHit {
  project_id: string;
  slug: string;
  author: string;
  title: string;
  description: string;
  downloads: number;
  follows: number;
  icon_url?: string;
  project_type: string;
  versions: string[];
  categories: string[];
  display_categories: string[];
  client_side: "required" | "optional" | "unsupported" | "unknown";
  server_side: "required" | "optional" | "unsupported" | "unknown";
  colour?: number;
  latest_version?: string;
  date_published?: string;
  date_modified?: string;
  gallery?: string[];
}

export interface ModrinthProject {
  id: string;
  slug: string;
  project_type: string;
  team: string;
  title: string;
  description: string;
  body: string;
  categories: string[];
  additional_categories: string[];
  versions: string[];
  game_versions: string[];
  loaders: string[];
  icon_url?: string;
  issues_url?: string;
  source_url?: string;
  wiki_url?: string;
  discord_url?: string;
  donation_urls?: ModrinthDonationUrl[];
  color?: number;
  downloads: number;
  followers: number;
  published: string;
  updated: string;
  server_side: "required" | "optional" | "unsupported" | "unknown";
  client_side: "required" | "optional" | "unsupported" | "unknown";
}

export interface ModrinthDonationUrl {
  id: string;
  platform: string;
  url: string;
}

export interface ModrinthVersion {
  id: string;
  project_id: string;
  author_id: string;
  featured: boolean;
  name: string;
  version_number: string;
  changelog?: string;
  changelog_url?: string;
  date_published: string;
  downloads: number;
  version_type: "release" | "beta" | "alpha";
  files: ModrinthApiFile[];
  dependencies: ModrinthApiDependency[];
  game_versions: string[];
  loaders: string[];
}

export type ModrinthDependencyType =
  "required" | "optional" | "incompatible" | "embedded";

// Raw API shapes are snake_case, the summaries below are camelCase
export interface ModrinthApiDependency {
  project_id?: string | null;
  version_id?: string | null;
  file_name?: string | null;
  dependency_type: ModrinthDependencyType;
}

export interface ModrinthApiFile {
  filename: string;
  primary: boolean;
  url: string;
  hashes: {
    sha1?: string;
    sha512?: string;
    [key: string]: string | undefined;
  };
  file_type?: string | null;
  size?: number;
}

/** Response of POST /version_files, keyed by the requested hash */
export type ModrinthVersionFilesResponse = Record<string, ModrinthVersion>;
