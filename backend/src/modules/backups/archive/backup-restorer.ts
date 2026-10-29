import { BackupType } from "@shared/types/backup.types";
import { promises as fs } from "fs";
import { join } from "path";
import { unpackBackup } from "./backup-archiver";
import { createExclusionMatcher } from "./exclusions";

/** Unpacks into staging, then replaces the server files */
export async function restoreInto(
  archivePath: string,
  stagingDir: string,
  serverPath: string,
  backup: { type: BackupType; globExceptions?: string[] },
  onStep: (step: "extract" | "clear" | "copy") => void,
): Promise<void> {
  onStep("extract");
  await unpackBackup(archivePath, stagingDir);
  const source = await restoreSource(stagingDir);

  // A full backup is the whole server state, files missing from it must go,
  // except the ones it left out on purpose
  if (backup.type === BackupType.FULL) {
    onStep("clear");
    await clearDirectory(
      serverPath,
      "",
      createExclusionMatcher(backup.globExceptions),
    );
  }
  onStep("copy");
  await fs.mkdir(serverPath, { recursive: true });
  await dropLinksInTheWay(source, serverPath);
  await fs.cp(source, serverPath, { recursive: true, force: true });
}

// Links the server planted would carry the copy outside its folder,
// backups never hold links so the restored files replace them
async function dropLinksInTheWay(source: string, dest: string): Promise<void> {
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    const target = join(dest, entry.name);
    const stats = await fs.lstat(target).catch(() => null);
    if (!stats) continue;
    if (stats.isSymbolicLink()) {
      await fs.rm(target, { force: true });
    } else if (entry.isDirectory() && stats.isDirectory()) {
      await dropLinksInTheWay(join(source, entry.name), target);
    }
  }
}

// Archives made before 4.1 nest everything in a single temp-* folder
async function restoreSource(stagingDir: string): Promise<string> {
  const entries = await fs.readdir(stagingDir, { withFileTypes: true });
  const only = entries.length === 1 ? entries[0] : null;
  return only?.isDirectory() && only.name.startsWith("temp-")
    ? join(stagingDir, only.name)
    : stagingDir;
}

async function clearDirectory(
  dir: string,
  relDir: string,
  excluded: (relPath: string) => boolean,
): Promise<void> {
  const entries = await fs
    .readdir(dir, { withFileTypes: true })
    .catch(() => []);
  for (const entry of entries) {
    const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
    if (excluded(rel)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await clearDirectory(full, rel, excluded);
      // Kept only when an excluded file still lives inside
      if ((await fs.readdir(full)).length === 0) await fs.rmdir(full);
    } else {
      await fs.rm(full, { force: true });
    }
  }
}
