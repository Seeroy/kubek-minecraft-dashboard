import { isRealInside } from "@/core/utils/paths";
import { getSafeServerPath } from "@/core/utils/serverPath";
import { BadRequestException } from "@nestjs/common";
import { type Dirent, promises as fs, type Stats } from "fs";
import { dirname } from "path";

export type FilesProgressFn = (
  done: number,
  total: number,
  currentName: string,
) => void;

const STAT_BATCH = 64;

// Same answer as existsSync, links are followed
export async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

// Exists and the entry itself is a folder, a link to one doesn't count
export async function isDirectoryEntry(path: string): Promise<boolean> {
  return (await pathExists(path)) && (await fs.lstat(path)).isDirectory();
}

// Exists and the entry itself is not a folder
export async function isFileEntry(path: string): Promise<boolean> {
  return (await pathExists(path)) && !(await fs.lstat(path)).isDirectory();
}

// Dirent type is unknown on some filesystems, lstat is the only answer then
export function hasKnownType(entry: Dirent): boolean {
  return entry.isFile() || entry.isDirectory() || entry.isSymbolicLink();
}

// lstat in batches so a huge folder doesn't open thousands of handles at once
// null for a null path, or for a failed lstat when errors are tolerated
export async function lstatBatched(
  paths: (string | null)[],
  tolerateErrors = false,
): Promise<(Stats | null)[]> {
  const out: (Stats | null)[] = [];
  for (let i = 0; i < paths.length; i += STAT_BATCH) {
    const batch = paths.slice(i, i + STAT_BATCH).map((path) => {
      if (path === null) return null;
      const stat = fs.lstat(path);
      return tolerateErrors ? stat.catch(() => null) : stat;
    });
    out.push(...(await Promise.all(batch)));
  }
  return out;
}

// Real path check, a symlink from the game server would pass the text check
export async function assertRealPathInside(
  serverId: string,
  safePath: string,
  allowMissing = false,
): Promise<void> {
  const base = getSafeServerPath(serverId);
  // A folder that doesn't exist yet can't link anywhere
  if (!(await pathExists(base))) return;
  if (!(await isRealInside(base, safePath, allowMissing))) {
    throw new BadRequestException(
      "Invalid path: directory traversal attempt detected",
    );
  }
}

// The entry itself may be a link, removing or renaming it doesn't touch its target
export function assertParentInside(
  serverId: string,
  safePath: string,
): Promise<void> {
  return assertRealPathInside(serverId, dirname(safePath));
}
