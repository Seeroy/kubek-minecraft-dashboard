import type { ModrinthDependencyType } from "./modrinth.types";

export interface ServerPluginRecord {
  id: string;
  serverId: string;
  projectId: string;
  versionId: string;
  fileName: string;
  fileHash?: string;
  dependencyOf?: string;
  installedAt: number;
  updatedAt?: number;
}

export type PluginType = "modrinth" | "manual" | "companion";

/** Kubek Companion jar, updated from GitHub releases instead of Modrinth */
export interface CompanionContentInfo {
  version: string;
  latestVersion: string | null;
  connected: boolean;
  releaseUrl: string;
}

export interface InstalledPluginView extends ServerPluginRecord {
  type: PluginType;
  companion?: CompanionContentInfo;
  metadata?: ModrinthProjectSummary;
  version?: ModrinthVersionSummary;
  hasUpdate: boolean;
  latestVersion?: ModrinthVersionSummary;
}

export interface ModrinthProjectSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  projectType: "plugin" | "mod" | "datapack" | "shader" | "modpack" | string;
  iconUrl?: string;
  downloads: number;
  serverSide: "required" | "optional" | "unsupported" | "unknown";
  clientSide: "required" | "optional" | "unsupported" | "unknown";
  categories: string[];
  displayCategories: string[];
  color?: number;
  latestVersionIds: string[];
}

export interface ModrinthVersionSummary {
  id: string;
  name: string;
  versionNumber: string;
  changelog?: string;
  publishedAt: string;
  loaders: string[];
  gameVersions: string[];
  downloads: number;
  files: ModrinthFileArtifact[];
  dependencies: ModrinthDependency[];
}

export interface ModrinthFileArtifact {
  filename: string;
  primary: boolean;
  url: string;
  hashes: {
    sha1?: string;
    sha512?: string;
    [key: string]: string | undefined;
  };
  fileType?: string;
  size?: number;
}

export interface ModrinthDependency {
  projectId?: string;
  versionId?: string;
  dependencyType: ModrinthDependencyType;
  fileName?: string;
}

export interface PluginInstallDependencyInput {
  projectId: string;
  versionId: string;
}
