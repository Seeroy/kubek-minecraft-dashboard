import { pack, unpack } from "@/core/utils/archives";
import { getErrorCode, getErrorMessage } from "@/core/utils/error";
import { isInside } from "@/core/utils/paths";
import { getSafeServerPath } from "@/core/utils/serverPath";
import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { promises as fs } from "fs";
import { join, normalize } from "path";
import {
  assertParentInside,
  assertRealPathInside,
  type FilesProgressFn,
  hasKnownType,
  isDirectoryEntry,
  isFileEntry,
  lstatBatched,
  pathExists,
} from "./file-jail";

// Multi-file work behind files tasks: bulk delete, zip and unzip
@Injectable()
export class FileBatchService {
  /**
   * Delete multiple files/directories in one batch with progress
   */
  async deletePaths(
    serverId: string,
    paths: string[],
    onProgress?: FilesProgressFn,
  ): Promise<void> {
    const unique = Array.from(new Set(paths));
    const total = unique.length;
    const failures: Array<{ name: string; reason: string }> = [];

    const PER_ITEM_TIMEOUT_MS = 60_000;

    for (let i = 0; i < unique.length; i++) {
      const p = unique[i];
      const name = p.split(/[\\/]/).filter(Boolean).pop() || p;
      try {
        const safePath = getSafeServerPath(serverId, p);
        if (!(await pathExists(safePath))) {
          failures.push({ name, reason: "not found" });
        } else {
          await assertParentInside(serverId, safePath);
          // Retry transient Windows locks (EBUSY/EPERM/ENOTEMPTY) a few times,
          // and race against a timeout so a stuck unlink never hangs the task
          await Promise.race([
            fs.rm(safePath, {
              recursive: true,
              force: true,
              maxRetries: 3,
              retryDelay: 200,
            }),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error("timeout")),
                PER_ITEM_TIMEOUT_MS,
              ),
            ),
          ]);
        }
      } catch (error: unknown) {
        failures.push({
          name,
          reason: getErrorCode(error) || getErrorMessage(error),
        });
      }
      onProgress?.(i + 1, total, name);
    }

    if (failures.length > 0) {
      const summary = failures.map((f) => `${f.name} (${f.reason})`).join(", ");
      throw new InternalServerErrorException(
        `Failed to delete ${failures.length}/${total}: ${summary}`,
      );
    }
  }

  /**
   * Create a ZIP archive from selected paths
   */
  async createZipArchive(
    serverId: string,
    paths: string[],
    destPath: string,
    archiveName: string,
    onProgress?: FilesProgressFn,
  ): Promise<{ archivePath: string }> {
    if (paths.length === 0) {
      throw new BadRequestException("At least one path is required");
    }

    // Resolve and validate destination
    const safeDestDir = getSafeServerPath(serverId, destPath);
    if (!(await isDirectoryEntry(safeDestDir))) {
      throw new NotFoundException("Destination directory not found");
    }
    await assertRealPathInside(serverId, safeDestDir);

    const finalRelArchivePath = join(destPath, `${archiveName}.zip`);
    const safeArchivePath = getSafeServerPath(serverId, finalRelArchivePath);
    if (await pathExists(safeArchivePath)) {
      throw new BadRequestException("Archive file already exists");
    }
    const partPath = `${safeArchivePath}.part`;

    // Normalize and dedupe source paths: drop entries that live inside another selected directory
    const normalizedSources = Array.from(
      new Set(paths.map((p) => normalize(p))),
    );
    normalizedSources.sort((a, b) => a.length - b.length);
    const sourcesToInclude: string[] = [];
    for (const src of normalizedSources) {
      const safe = getSafeServerPath(serverId, src);
      if (!(await pathExists(safe))) {
        throw new NotFoundException(
          `Source not found: ${src.split(/[\\/]/).pop()}`,
        );
      }
      await assertRealPathInside(serverId, safe);
      let isInsideExisting = false;
      for (const existing of sourcesToInclude) {
        const safeExisting = getSafeServerPath(serverId, existing);
        if (
          (await fs.lstat(safeExisting)).isDirectory() &&
          safe !== safeExisting &&
          isInside(safeExisting, safe)
        ) {
          isInsideExisting = true;
          break;
        }
      }
      if (!isInsideExisting) {
        sourcesToInclude.push(src);
      }
    }

    // Collect all files (with relative path inside the archive) up front so we know the total for progress
    type Entry = { absPath: string; archiveRelPath: string; size: number };
    const entries: Entry[] = [];
    for (const src of sourcesToInclude) {
      const safeSrc = getSafeServerPath(serverId, src);
      const stats = await fs.lstat(safeSrc);
      const baseName = src.split(/[\\/]/).filter(Boolean).pop() || archiveName;

      if (stats.isFile()) {
        entries.push({
          absPath: safeSrc,
          archiveRelPath: baseName,
          size: stats.size,
        });
      } else if (stats.isDirectory()) {
        const walk = async (dir: string, rel: string) => {
          const items = await fs.readdir(dir, { withFileTypes: true });
          // Folders go by dirent type, files need lstat for the size
          const stats = await lstatBatched(
            items.map((item) =>
              item.isFile() || !hasKnownType(item)
                ? join(dir, item.name)
                : null,
            ),
          );
          for (const [i, item] of items.entries()) {
            const full = join(dir, item.name);
            const relPath = join(rel, item.name);
            const st = stats[i];
            if (st ? st.isDirectory() : item.isDirectory()) {
              await walk(full, relPath);
            } else if (st?.isFile()) {
              entries.push({
                absPath: full,
                archiveRelPath: relPath,
                size: st.size,
              });
            }
          }
        };
        await walk(safeSrc, baseName);
      }
    }

    if (entries.length === 0) {
      throw new BadRequestException("No files to archive (selection is empty)");
    }

    const fileName = `${archiveName}.zip`;
    try {
      // Stream into .part, then atomically rename to final
      await pack(
        entries.map((entry) => ({
          path: entry.absPath,
          relativePath: entry.archiveRelPath,
        })),
        partPath,
        {
          totalBytes: entries.reduce((sum, entry) => sum + entry.size, 0),
          onProgress: (written, total) =>
            onProgress?.(Math.min(written, total), total, fileName),
        },
      );

      await fs.rename(partPath, safeArchivePath);
      return { archivePath: finalRelArchivePath };
    } catch (error: unknown) {
      try {
        if (await pathExists(partPath)) await fs.unlink(partPath);
      } catch {
        // ignore cleanup errors
      }
      throw new InternalServerErrorException(
        `Failed to create archive: ${getErrorMessage(error)}`,
      );
    }
  }

  /**
   * Extract a ZIP archive into the directory containing the archive
   */
  async extractZipArchive(
    serverId: string,
    archivePath: string,
    onProgress?: FilesProgressFn,
  ): Promise<{ extractPath: string }> {
    const safeArchivePath = getSafeServerPath(serverId, archivePath);
    if (!(await isFileEntry(safeArchivePath))) {
      throw new NotFoundException("Archive file not found");
    }

    const archiveName = archivePath.split(/[\\/]/).filter(Boolean).pop() || "";
    if (!/\.zip$/i.test(archiveName)) {
      throw new BadRequestException("Only .zip archives can be extracted");
    }

    // Destination = the directory that holds the archive
    const parts = archivePath.split(/[\\/]/).filter(Boolean);
    parts.pop();
    const destRelPath = parts.length > 0 ? parts.join("/") : "";
    const safeDestPath = getSafeServerPath(serverId, destRelPath);
    await assertRealPathInside(serverId, safeArchivePath);

    try {
      await unpack(safeArchivePath, safeDestPath, { onProgress });
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to extract archive: ${getErrorMessage(error)}`,
      );
    }
    return { extractPath: destRelPath };
  }
}
