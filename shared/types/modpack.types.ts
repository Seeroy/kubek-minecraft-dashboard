export type ModpackSource = "file" | "modrinth";

export type ModpackLoader = "fabric";

export enum ModpackErrorCode {
  /** Not a readable .mrpack or the index breaks the format */
  INVALID = "MODPACK_INVALID",
  /** Quilt, Forge, NeoForge or no loader at all */
  LOADER_UNSUPPORTED = "MODPACK_LOADER_UNSUPPORTED",
  /** A file path leaves the server folder */
  UNSAFE_PATH = "MODPACK_UNSAFE_PATH",
  /** A file has no download from an allowed host */
  DOWNLOAD_NOT_ALLOWED = "MODPACK_DOWNLOAD_NOT_ALLOWED",
  /** The inspected pack expired or belongs to someone else */
  NOT_FOUND = "MODPACK_NOT_FOUND",
}

export type ModpackWarning =
  | { code: "optional_server_files"; count: number }
  | { code: "unknown_env_files"; count: number }
  | { code: "client_overrides_ignored" };

/** What an inspected pack would install, shown before the server is created */
export interface ModpackPreview {
  /** Handle of the staged pack, passed back to install */
  packId: string;
  source: ModpackSource;
  projectId?: string;
  versionId?: string;
  iconUrl?: string;
  name: string;
  version: string;
  summary?: string;
  minecraftVersion: string;
  loader: ModpackLoader;
  loaderVersion: string;
  /** Files downloaded for the server */
  fileCount: number;
  /** Jars among them, under mods/ */
  modCount: number;
  /** Declared download size in bytes */
  downloadSize: number;
  skippedClientOnly: number;
  warnings: ModpackWarning[];
}

export interface InstallModpackProps {
  packId: string;
  name: string;
  port?: number;
  /** Max heap in MB */
  memory?: number;
  javaVersion?: number;
  javaPath?: string;
}

/** Origin of a server made from a modpack */
export interface ServerModpackRecord {
  serverId: string;
  source: ModpackSource;
  projectId?: string;
  versionId?: string;
  name: string;
  version: string;
  installedAt: number;
}
