import { getErrorCode, getErrorMessage } from "@/core/utils/error";
import { getSafeServerPath } from "@/core/utils/serverPath";
import { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { FileType, IFile } from "@shared/types/file.types";
import compressing from "compressing";
import {
  createWriteStream,
  existsSync,
  promises as fs,
  lstatSync,
  readdirSync,
} from "fs";
import { join, normalize, resolve, sep } from "path";

export type FilesProgressFn = (
  done: number,
  total: number,
  currentName: string,
) => void;

@Injectable()
export class FileManagerService {
  constructor(private readonly bus: ExtensionEventBus) {}

  // Public so adjacent modules  can reuse
  resolveSafePath(serverId: string, requestedPath: string = ""): string {
    return getSafeServerPath(serverId, requestedPath);
  }

  async scanDirectory(
    serverId: string,
    directoryPath: string,
  ): Promise<IFile[]> {
    const safePath = getSafeServerPath(serverId, directoryPath);

    if (!existsSync(safePath) || !lstatSync(safePath).isDirectory()) {
      throw new NotFoundException("Directory not found");
    }

    try {
      const items = await fs.readdir(safePath);
      const filesResult: IFile[] = [];

      for (const item of items) {
        const itemPath = join(safePath, item);
        const stats = lstatSync(itemPath);

        const fileItem: IFile = {
          name: item,
          path: join(directoryPath, item),
          type: stats.isDirectory() ? FileType.DIRECTORY : FileType.FILE,
          size: stats.size,
          modify: stats.mtime,
        };

        filesResult.push(fileItem);
      }

      return filesResult.sort(
        (a, b) =>
          (b.type === FileType.DIRECTORY ? 1 : 0) -
            (a.type === FileType.DIRECTORY ? 1 : 0) ||
          a.name.localeCompare(b.name),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to read directory: ${error.message}`,
      );
    }
  }

  /**
   * Recursively search files and directories by name
   */
  async searchFiles(
    serverId: string,
    query: string,
    basePath: string = "",
  ): Promise<IFile[]> {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    // Validates that basePath stays within the server directory
    getSafeServerPath(serverId, basePath);

    const MAX_DEPTH = 12;
    const MAX_RESULTS = 500;
    const results: IFile[] = [];

    const walk = async (relativeDir: string, depth: number): Promise<void> => {
      if (depth > MAX_DEPTH || results.length >= MAX_RESULTS) return;

      const safeDir = getSafeServerPath(serverId, relativeDir);
      let items: string[];
      try {
        items = await fs.readdir(safeDir);
      } catch {
        return; // Unreadable directory - skip silently
      }

      for (const item of items) {
        if (results.length >= MAX_RESULTS) return;

        const relativePath = join(relativeDir, item);
        let stats;
        try {
          stats = lstatSync(join(safeDir, item));
        } catch {
          continue;
        }

        // Skip symlinks to prevent escaping the server dir and traversal loops
        if (stats.isSymbolicLink()) continue;

        if (item.toLowerCase().includes(needle)) {
          results.push({
            name: item,
            path: relativePath,
            type: stats.isDirectory() ? FileType.DIRECTORY : FileType.FILE,
            size: stats.size,
            modify: stats.mtime,
          });
        }

        if (stats.isDirectory()) {
          await walk(relativePath, depth + 1);
        }
      }
    };

    await walk(basePath, 0);

    return results.sort(
      (a, b) =>
        (b.type === FileType.DIRECTORY ? 1 : 0) -
          (a.type === FileType.DIRECTORY ? 1 : 0) ||
        a.name.localeCompare(b.name),
    );
  }

  async readFile(serverId: string, filePath: string): Promise<Buffer> {
    const safePath = getSafeServerPath(serverId, filePath);

    if (!existsSync(safePath) || lstatSync(safePath).isDirectory()) {
      throw new NotFoundException("File not found");
    }

    try {
      return await fs.readFile(safePath);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to read file: ${error.message}`,
      );
    }
  }

  async writeFile(
    serverId: string,
    filePath: string,
    data: string,
  ): Promise<void> {
    const safePath = getSafeServerPath(serverId, filePath);

    try {
      // Ensure directory exists
      const dir = resolve(safePath, "..");
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(safePath, data);
      this.bus.publish("file.changed", { serverId, path: filePath });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to write file: ${error.message}`,
      );
    }
  }

  async deleteFile(serverId: string, filePath: string): Promise<void> {
    const safePath = getSafeServerPath(serverId, filePath);

    if (!existsSync(safePath)) {
      throw new NotFoundException("File not found");
    }

    if (lstatSync(safePath).isDirectory()) {
      throw new BadRequestException(
        "Path is a directory, use deleteDirectory for directories",
      );
    }

    try {
      await fs.unlink(safePath);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete file: ${error.message}`,
      );
    }
  }

  async deleteDirectory(
    serverId: string,
    directoryPath: string,
  ): Promise<void> {
    const safePath = getSafeServerPath(serverId, directoryPath);

    if (!existsSync(safePath) || !lstatSync(safePath).isDirectory()) {
      throw new NotFoundException("Directory not found");
    }

    try {
      // Use recursive option to delete non-empty directories
      await fs.rm(safePath, { recursive: true, force: true });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete directory: ${error.message}`,
      );
    }
  }

  /**
   * LEGACY: Delete empty directory
   */
  async deleteEmptyDirectory(
    serverId: string,
    directoryPath: string,
  ): Promise<void> {
    const safePath = getSafeServerPath(serverId, directoryPath);

    if (!existsSync(safePath) || !lstatSync(safePath).isDirectory()) {
      throw new NotFoundException("Directory not found");
    }

    if (readdirSync(safePath).length !== 0) {
      throw new BadRequestException("Directory is not empty");
    }

    try {
      await fs.rmdir(safePath);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete directory: ${error.message}`,
      );
    }
  }

  async renameFile(
    serverId: string,
    oldPath: string,
    newName: string,
  ): Promise<void> {
    const safeOldPath = getSafeServerPath(serverId, oldPath);

    if (!existsSync(safeOldPath)) {
      throw new NotFoundException("File or directory not found");
    }

    const parentDir = resolve(safeOldPath, "..");
    const safeNewPath = join(parentDir, newName);

    // Security check for the new path
    getSafeServerPath(serverId, join(oldPath, "..", newName));

    try {
      await fs.rename(safeOldPath, safeNewPath);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to rename: ${error.message}`,
      );
    }
  }

  async createDirectory(
    serverId: string,
    parentPath: string,
    name: string,
  ): Promise<void> {
    const safeParentPath = getSafeServerPath(serverId, parentPath);
    const newDirPath = join(safeParentPath, name);

    // Security check for the new directory path
    getSafeServerPath(serverId, join(parentPath, name));

    if (existsSync(newDirPath)) {
      throw new BadRequestException("Directory already exists");
    }

    try {
      await fs.mkdir(newDirPath, { recursive: true });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to create directory: ${error.message}`,
      );
    }
  }

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
        if (!existsSync(safePath)) {
          failures.push({ name, reason: "not found" });
        } else {
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
    if (!existsSync(safeDestDir) || !lstatSync(safeDestDir).isDirectory()) {
      throw new NotFoundException("Destination directory not found");
    }

    const finalRelArchivePath = join(destPath, `${archiveName}.zip`);
    const safeArchivePath = getSafeServerPath(serverId, finalRelArchivePath);
    if (existsSync(safeArchivePath)) {
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
      if (!existsSync(safe)) {
        throw new NotFoundException(
          `Source not found: ${src.split(/[\\/]/).pop()}`,
        );
      }
      const isInsideExisting = sourcesToInclude.some((existing) => {
        const safeExisting = getSafeServerPath(serverId, existing);
        return (
          lstatSync(safeExisting).isDirectory() &&
          safe.startsWith(safeExisting + require("path").sep)
        );
      });
      if (!isInsideExisting) {
        sourcesToInclude.push(src);
      }
    }

    // Collect all files (with relative path inside the archive) up front so we know the total for progress
    type Entry = { absPath: string; archiveRelPath: string };
    const entries: Entry[] = [];
    for (const src of sourcesToInclude) {
      const safeSrc = getSafeServerPath(serverId, src);
      const stats = lstatSync(safeSrc);
      const baseName = src.split(/[\\/]/).filter(Boolean).pop() || archiveName;

      if (stats.isFile()) {
        entries.push({ absPath: safeSrc, archiveRelPath: baseName });
      } else if (stats.isDirectory()) {
        const walk = async (dir: string, rel: string) => {
          const items = await fs.readdir(dir);
          for (const item of items) {
            const full = join(dir, item);
            const relPath = join(rel, item);
            const st = lstatSync(full);
            if (st.isDirectory()) {
              await walk(full, relPath);
            } else if (st.isFile()) {
              entries.push({ absPath: full, archiveRelPath: relPath });
            }
          }
        };
        await walk(safeSrc, baseName);
      }
    }

    if (entries.length === 0) {
      throw new BadRequestException("No files to archive (selection is empty)");
    }

    // Stream into .part, then atomically rename to final
    const zipStream: any = new (compressing as any).zip.Stream();
    const output = createWriteStream(partPath);

    const writeDone = new Promise<void>((resolveWrite, rejectWrite) => {
      output.on("finish", () => resolveWrite());
      output.on("error", (err) => rejectWrite(err));
      zipStream.on("error", (err: Error) => rejectWrite(err));
    });

    try {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        zipStream.addEntry(entry.absPath, {
          relativePath: entry.archiveRelPath,
        });
        onProgress?.(i + 1, entries.length, entry.archiveRelPath);
      }

      zipStream.pipe(output);
      await writeDone;

      await fs.rename(partPath, safeArchivePath);
      return { archivePath: finalRelArchivePath };
    } catch (error: unknown) {
      try {
        if (existsSync(partPath)) await fs.unlink(partPath);
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
    if (
      !existsSync(safeArchivePath) ||
      lstatSync(safeArchivePath).isDirectory()
    ) {
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

    const UncompressStream = (compressing as any).zip.UncompressStream;

    return await new Promise<{ extractPath: string }>(
      (resolveExtract, rejectExtract) => {
        let processed = 0;
        const stream = new UncompressStream({ source: safeArchivePath });

        const fail = (err: Error) => {
          stream.destroy();
          rejectExtract(err);
        };

        stream.on("error", (err: Error) => {
          fail(
            new InternalServerErrorException(
              `Failed to extract archive: ${err.message}`,
            ),
          );
        });

        stream.on("finish", () => {
          resolveExtract({ extractPath: destRelPath });
        });

        stream.on(
          "entry",
          (header: any, entryStream: any, next: () => void) => {
            const entryName: string = header.name;
            const outPath = join(safeDestPath, entryName);

            const resolvedOut = resolve(outPath);
            const resolvedDest = resolve(safeDestPath);
            if (
              resolvedOut !== resolvedDest &&
              !resolvedOut.startsWith(resolvedDest + sep)
            ) {
              entryStream.resume();
              fail(
                new BadRequestException(
                  "Archive contains entries with unsafe paths",
                ),
              );
              return;
            }

            if (header.type === "directory") {
              fs.mkdir(outPath, { recursive: true })
                .then(() => {
                  entryStream.resume();
                  processed++;
                  onProgress?.(processed, processed + 1, entryName);
                  next();
                })
                .catch(fail);
            } else {
              fs.mkdir(resolve(outPath, ".."), { recursive: true })
                .then(() => {
                  const out = createWriteStream(outPath);
                  entryStream.pipe(out);
                  out.on("finish", () => {
                    processed++;
                    onProgress?.(processed, processed + 1, entryName);
                    next();
                  });
                  out.on("error", fail);
                })
                .catch(fail);
            }
          },
        );
      },
    );
  }

  async uploadFile(
    serverId: string,
    directoryPath: string,
    file: Express.Multer.File,
  ): Promise<void> {
    const safeDirPath = getSafeServerPath(serverId, directoryPath);
    const filePath = join(safeDirPath, file.originalname);

    // Security check for the file path
    getSafeServerPath(serverId, join(directoryPath, file.originalname));

    if (existsSync(filePath)) {
      throw new BadRequestException("File already exists");
    }

    try {
      // Ensure directory exists
      await fs.mkdir(safeDirPath, { recursive: true });

      // Write the file buffer to disk
      await fs.writeFile(filePath, file.buffer);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to upload file: ${error.message}`,
      );
    }
  }
}
