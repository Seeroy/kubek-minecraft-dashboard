import { pack, unpackArchive } from "@/core/utils/archives";
import { BackupFormat } from "@shared/types/backup.types";
import { join } from "path";
import type { ArchiveEntry } from "./backup-files";

/** Packs entries straight into the archive, no staging copy of the files */
export async function packArchive(
  entries: ArchiveEntry[],
  serverPath: string,
  outputPath: string,
  format: BackupFormat,
  onProgress: (fraction: number) => void,
): Promise<void> {
  await pack(
    entries.map((entry) => ({
      path: join(serverPath, entry.path),
      relativePath: entry.path,
    })),
    outputPath,
    {
      type: format === BackupFormat.TAR_GZ ? "tgz" : "zip",
      totalBytes: entries.reduce((sum, e) => sum + e.size, 0),
      onProgress: (written, total) => onProgress(Math.min(1, written / total)),
    },
  );
}

export async function unpackBackup(
  archivePath: string,
  destination: string,
): Promise<void> {
  // unpackArchive jails every entry to the destination
  if (!(await unpackArchive(archivePath, destination))) {
    throw new Error("Archive could not be extracted");
  }
}

export async function sha256File(path: string): Promise<string> {
  const hasher = new Bun.CryptoHasher("sha256");
  for await (const chunk of Bun.file(path).stream()) hasher.update(chunk);
  return hasher.digest("hex");
}
