import { getRealServerPath } from "@/core/utils/serverPath";
import { BadRequestException } from "@nestjs/common";
import { BackupType } from "@shared/types/backup.types";
import { promises as fs } from "fs";
import { join, posix, relative, sep } from "path";
import type { BackupRecord } from "../repositories/backups.repository";
import { createExclusionMatcher } from "./exclusions";

export interface ArchiveEntry {
  /** Path relative to the server folder, with forward slashes */
  path: string;
  size: number;
}

const MAX_BACKUP_SIZE = 10 * 1024 * 1024 * 1024;
const MAX_FILE_COUNT = 10_000;

/** Files that go into the archive, symlinks are skipped */
export async function collectBackupFiles(
  backup: BackupRecord,
  serverPath: string,
): Promise<ArchiveEntry[]> {
  const excluded = createExclusionMatcher(backup.globExceptions);
  // walk skips links, a linked parent of a selected path is caught by realpath
  const roots =
    backup.type === BackupType.FULL
      ? [serverPath]
      : await Promise.all(
          (backup.selectedFiles ?? []).map((file) =>
            getRealServerPath(backup.serverId, file.path),
          ),
        );

  const entries: ArchiveEntry[] = [];
  for (const root of roots) {
    await walk(root, serverPath, excluded, entries);
  }
  assertLimits(entries);
  return entries;
}

async function walk(
  target: string,
  serverPath: string,
  excluded: (relPath: string) => boolean,
  out: ArchiveEntry[],
): Promise<void> {
  const rel = relative(serverPath, target).split(sep).join(posix.sep);
  if (rel && excluded(rel)) return;
  const stats = await fs.lstat(target);
  if (stats.isFile()) {
    out.push({ path: rel, size: stats.size });
  } else if (stats.isDirectory()) {
    for (const name of await fs.readdir(target)) {
      await walk(join(target, name), serverPath, excluded, out);
    }
  }
}

function assertLimits(entries: ArchiveEntry[]): void {
  const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
  if (totalSize > MAX_BACKUP_SIZE) {
    throw new BadRequestException(
      `Backup size (${totalSize} bytes) exceeds the limit of ${MAX_BACKUP_SIZE} bytes`,
    );
  }
  if (entries.length > MAX_FILE_COUNT) {
    throw new BadRequestException(
      `Backup has ${entries.length} files, the limit is ${MAX_FILE_COUNT}`,
    );
  }
}
