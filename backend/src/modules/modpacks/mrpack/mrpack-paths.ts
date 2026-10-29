import { ModpackErrorCode } from "@shared/types/modpack.types";
import { isInside } from "@/core/utils/paths";
import { isAbsolute, posix, resolve } from "path";
import { MrpackError } from "./mrpack-error";

// Hosts the .mrpack spec allows downloads from
export const ALLOWED_DOWNLOAD_HOSTS = new Set([
  "cdn.modrinth.com",
  "github.com",
  "raw.githubusercontent.com",
  "gitlab.com",
]);

/**
 * Normalize a pack-relative path, rejecting anything that could leave the
 * server folder: absolute paths, drive letters, backslashes and ".." segments
 */
export function safeRelativePath(raw: unknown): string {
  if (typeof raw !== "string" || !raw || raw.includes("\0")) {
    throw unsafe(raw);
  }
  if (
    raw.includes("\\") ||
    raw.startsWith("/") ||
    /^[a-zA-Z]:/.test(raw) ||
    isAbsolute(raw)
  ) {
    throw unsafe(raw);
  }
  const segments = raw.split("/");
  if (segments.some((segment) => segment === "..")) throw unsafe(raw);

  const normalized = posix.normalize(raw).replace(/\/+$/, "");
  if (!normalized || normalized === "." || normalized.startsWith("../")) {
    throw unsafe(raw);
  }
  return normalized;
}

/** Absolute target of a pack path inside the server folder */
export function jailPath(baseDir: string, relativePath: string): string {
  const base = resolve(baseDir);
  const full = resolve(base, safeRelativePath(relativePath));
  if (full === base || !isInside(base, full)) {
    throw unsafe(relativePath);
  }
  return full;
}

/** Download urls on allowed hosts over https, in declared order */
export function allowedDownloads(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  return urls.filter((url): url is string => {
    if (typeof url !== "string") return false;
    try {
      const parsed = new URL(url);
      return (
        parsed.protocol === "https:" &&
        ALLOWED_DOWNLOAD_HOSTS.has(parsed.hostname.toLowerCase())
      );
    } catch {
      return false;
    }
  });
}

export type OverrideLayer = "overrides" | "server-overrides";

/**
 * Map an archive entry to its override layer and target path, null for
 * entries that are not server overrides (index, client-overrides, junk)
 */
export function overrideEntry(
  entryName: string,
): { layer: OverrideLayer; path: string } | null {
  const name = entryName.replace(/^\.\//, "");
  for (const layer of ["server-overrides", "overrides"] as const) {
    const prefix = `${layer}/`;
    if (!name.startsWith(prefix)) continue;
    const rest = name.slice(prefix.length);
    if (!rest || rest.endsWith("/")) return null;
    return { layer, path: safeRelativePath(rest) };
  }
  return null;
}

function unsafe(path: unknown): MrpackError {
  return new MrpackError(
    ModpackErrorCode.UNSAFE_PATH,
    `Unsafe path in modpack: ${String(path)}`,
  );
}
