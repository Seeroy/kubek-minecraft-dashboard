import {
  ModpackErrorCode,
  type ModpackWarning,
} from "@shared/types/modpack.types";
import { MrpackError } from "./mrpack-error";
import { allowedDownloads, safeRelativePath } from "./mrpack-paths";

export const MRPACK_INDEX_FILE = "modrinth.index.json";

// Generous caps against hostile indexes, real packs stay far below
const MAX_FILES = 5000;
const MAX_FILE_SIZE = 1024 * 1024 * 1024;

const UNSUPPORTED_LOADERS = ["quilt-loader", "forge", "neoforge"];

export interface MrpackFile {
  path: string;
  sha1: string;
  sha512: string;
  size: number;
  downloads: string[];
}

export interface MrpackManifest {
  name: string;
  versionId: string;
  summary?: string;
  minecraftVersion: string;
  loader: "fabric";
  loaderVersion: string;
  files: MrpackFile[];
  skippedClientOnly: number;
  warnings: ModpackWarning[];
}

type Json = Record<string, unknown>;

/**
 * Validates and reads a Modrinth pack index (format version 1). Only Fabric
 * packs pass, files the server does not need are dropped
 */
export class MrpackReader {
  static parseIndex(raw: unknown): MrpackManifest {
    const index = asObject(raw, "index");
    if (index.formatVersion !== 1) {
      throw invalid(`Unsupported formatVersion ${String(index.formatVersion)}`);
    }
    if (index.game !== "minecraft") {
      throw invalid(`Unsupported game ${String(index.game)}`);
    }

    const { minecraftVersion, loaderVersion } = MrpackReader.readLoader(
      asObject(index.dependencies, "dependencies"),
    );
    const files = Array.isArray(index.files) ? index.files : null;
    if (!files) throw invalid("files must be an array");
    if (files.length > MAX_FILES) throw invalid("Too many files in modpack");

    let skippedClientOnly = 0;
    let optionalServer = 0;
    let unknownEnv = 0;
    const serverFiles: MrpackFile[] = [];
    for (const entry of files) {
      const file = asObject(entry, "file");
      const env =
        file.env === undefined ? undefined : asObject(file.env, "env");
      if (env?.server === "unsupported") {
        skippedClientOnly++;
        continue;
      }
      if (env?.server === "optional") optionalServer++;
      if (!env) unknownEnv++;
      serverFiles.push(MrpackReader.readFile(file));
    }

    const warnings: ModpackWarning[] = [];
    if (optionalServer > 0) {
      warnings.push({ code: "optional_server_files", count: optionalServer });
    }
    if (unknownEnv > 0) {
      warnings.push({ code: "unknown_env_files", count: unknownEnv });
    }

    return {
      name: requireString(index.name, "name"),
      versionId: requireString(index.versionId, "versionId"),
      summary: typeof index.summary === "string" ? index.summary : undefined,
      minecraftVersion,
      loader: "fabric",
      loaderVersion,
      files: serverFiles,
      skippedClientOnly,
      warnings,
    };
  }

  private static readLoader(dependencies: Json): {
    minecraftVersion: string;
    loaderVersion: string;
  } {
    const unsupported = Object.keys(dependencies).find((key) =>
      UNSUPPORTED_LOADERS.includes(key),
    );
    if (unsupported) {
      throw new MrpackError(
        ModpackErrorCode.LOADER_UNSUPPORTED,
        `Loader ${unsupported} is not supported, only Fabric packs can be installed`,
      );
    }
    const unknown = Object.keys(dependencies).find(
      (key) => key !== "minecraft" && key !== "fabric-loader",
    );
    if (unknown) throw invalid(`Unknown dependency ${unknown}`);

    if (typeof dependencies["fabric-loader"] !== "string") {
      throw new MrpackError(
        ModpackErrorCode.LOADER_UNSUPPORTED,
        "The pack declares no Fabric loader",
      );
    }
    return {
      minecraftVersion: versionToken(dependencies.minecraft, "minecraft"),
      loaderVersion: versionToken(
        dependencies["fabric-loader"],
        "fabric-loader",
      ),
    };
  }

  private static readFile(file: Json): MrpackFile {
    const path = safeRelativePath(file.path);
    const hashes = asObject(file.hashes, "hashes");
    const sha1 = hexDigest(hashes.sha1, 40, path);
    const sha512 = hexDigest(hashes.sha512, 128, path);

    const size = Number(file.fileSize);
    if (!Number.isInteger(size) || size < 0 || size > MAX_FILE_SIZE) {
      throw invalid(`Bad fileSize for ${path}`);
    }

    const downloads = allowedDownloads(file.downloads);
    if (downloads.length === 0) {
      throw new MrpackError(
        ModpackErrorCode.DOWNLOAD_NOT_ALLOWED,
        `${path} has no download from an allowed host`,
      );
    }
    return { path, sha1, sha512, size, downloads };
  }
}

function asObject(value: unknown, field: string): Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalid(`${field} must be an object`);
  }
  return value as Json;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw invalid(`${field} is required`);
  }
  return value.trim();
}

// Versions end up in download urls, so only plain tokens are accepted
function versionToken(value: unknown, field: string): string {
  const version = requireString(value, field);
  if (!/^[\w.+-]+$/.test(version)) throw invalid(`Bad ${field} version`);
  return version;
}

function hexDigest(value: unknown, length: number, path: string): string {
  if (typeof value !== "string" || !/^[0-9a-fA-F]+$/.test(value)) {
    throw invalid(`Missing hash for ${path}`);
  }
  if (value.length !== length) throw invalid(`Bad hash for ${path}`);
  return value.toLowerCase();
}

function invalid(message: string): MrpackError {
  return new MrpackError(ModpackErrorCode.INVALID, message);
}
