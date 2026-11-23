import { ApiErrorCode } from "@/core/errors/error-codes";
import { getSafeServerPath } from "@/core/utils/serverPath";
import { placeUpload, removeUpload } from "@/core/utils/uploads";
import { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  PayloadTooLargeException,
} from "@nestjs/common";
import { FileType, IFile } from "@shared/types/file.types";
import { type Dirent, promises as fs, type ReadStream } from "fs";
import { join, resolve } from "path";
import {
  assertParentInside,
  assertRealPathInside,
  hasKnownType,
  isDirectoryEntry,
  isFileEntry,
  lstatBatched,
  pathExists,
} from "./file-jail";

// The editor and the assistant only deal with text of a sane size
export const MAX_READ_FILE_BYTES = 5 * 1024 * 1024;

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

    if (!(await isDirectoryEntry(safePath))) {
      throw new NotFoundException("Directory not found");
    }
    await assertRealPathInside(serverId, safePath);

    try {
      const items = await fs.readdir(safePath);
      const stats = await lstatBatched(
        items.map((item) => join(safePath, item)),
      );
      const filesResult: IFile[] = items.map((item, i) => ({
        name: item,
        path: join(directoryPath, item),
        type: stats[i]!.isDirectory() ? FileType.DIRECTORY : FileType.FILE,
        size: stats[i]!.size,
        modify: stats[i]!.mtime,
      }));

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

    const safeBase = getSafeServerPath(serverId, basePath);
    if (await pathExists(safeBase)) {
      await assertRealPathInside(serverId, safeBase);
    }

    const MAX_DEPTH = 12;
    const MAX_RESULTS = 500;
    const results: IFile[] = [];

    const walk = async (relativeDir: string, depth: number): Promise<void> => {
      if (depth > MAX_DEPTH || results.length >= MAX_RESULTS) return;

      const safeDir = getSafeServerPath(serverId, relativeDir);
      let items: Dirent[];
      try {
        items = await fs.readdir(safeDir, { withFileTypes: true });
      } catch {
        return; // Unreadable directory - skip silently
      }

      // Only matches need size and mtime, folders are walked by dirent type
      const matches = items.map((item) =>
        item.name.toLowerCase().includes(needle),
      );
      const stats = await lstatBatched(
        items.map((item, i) =>
          !item.isSymbolicLink() && (matches[i] || !hasKnownType(item))
            ? join(safeDir, item.name)
            : null,
        ),
        true,
      );

      for (const [i, item] of items.entries()) {
        if (results.length >= MAX_RESULTS) return;

        // Skip symlinks to prevent escaping the server dir and traversal loops
        if (item.isSymbolicLink()) continue;
        const stat = stats[i];
        const needsStat = matches[i] || !hasKnownType(item);
        if (needsStat && (!stat || stat.isSymbolicLink())) continue;

        const relativePath = join(relativeDir, item.name);
        const isDirectory = stat ? stat.isDirectory() : item.isDirectory();
        if (matches[i]) {
          results.push({
            name: item.name,
            path: relativePath,
            type: isDirectory ? FileType.DIRECTORY : FileType.FILE,
            size: stat!.size,
            modify: stat!.mtime,
          });
        }

        if (isDirectory) {
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

    if (!(await isFileEntry(safePath))) {
      throw new NotFoundException("File not found");
    }
    await assertRealPathInside(serverId, safePath);

    const { size } = await fs.stat(safePath);
    if (size > MAX_READ_FILE_BYTES) {
      throw new PayloadTooLargeException({
        code: ApiErrorCode.PAYLOAD_TOO_LARGE,
        message: `File is too large to open (over ${MAX_READ_FILE_BYTES / 1024 / 1024} MB), download it instead`,
      });
    }

    try {
      return await fs.readFile(safePath);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to read file: ${error.message}`,
      );
    }
  }

  /** First bytes of a file of any size, with its full size */
  async readHead(
    serverId: string,
    filePath: string,
    maxBytes: number,
  ): Promise<{ head: Buffer; size: number }> {
    const safePath = getSafeServerPath(serverId, filePath);

    if (!(await isFileEntry(safePath))) {
      throw new NotFoundException("File not found");
    }
    await assertRealPathInside(serverId, safePath);

    const handle = await fs.open(safePath, "r");
    try {
      const { size } = await handle.stat();
      const head = Buffer.alloc(Math.min(size, maxBytes));
      const { bytesRead } = await handle.read(head, 0, head.length, 0);
      return { head: head.subarray(0, bytesRead), size };
    } finally {
      await handle.close();
    }
  }

  /** Stream for downloads, the file is never read into memory */
  async openReadStream(
    serverId: string,
    filePath: string,
  ): Promise<{ stream: ReadStream; size: number }> {
    const safePath = getSafeServerPath(serverId, filePath);

    if (!(await isFileEntry(safePath))) {
      throw new NotFoundException("File not found");
    }
    await assertRealPathInside(serverId, safePath);

    const handle = await fs.open(safePath, "r").catch((error) => {
      throw new InternalServerErrorException(
        `Failed to read file: ${error.message}`,
      );
    });
    try {
      const { size } = await handle.stat();
      return { stream: handle.createReadStream(), size };
    } catch (error) {
      await handle.close();
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
    await assertRealPathInside(serverId, safePath, true);

    try {
      // Ensure directory exists
      const dir = resolve(safePath, "..");
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(safePath, data);
      this.changed(serverId, filePath);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to write file: ${error.message}`,
      );
    }
  }

  async deleteFile(serverId: string, filePath: string): Promise<void> {
    const safePath = getSafeServerPath(serverId, filePath);

    if (!(await pathExists(safePath))) {
      throw new NotFoundException("File not found");
    }

    if ((await fs.lstat(safePath)).isDirectory()) {
      throw new BadRequestException(
        "Path is a directory, use deleteDirectory for directories",
      );
    }
    await assertParentInside(serverId, safePath);

    try {
      await fs.unlink(safePath);
      this.changed(serverId, filePath);
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

    if (!(await isDirectoryEntry(safePath))) {
      throw new NotFoundException("Directory not found");
    }
    await assertParentInside(serverId, safePath);

    try {
      // Use recursive option to delete non-empty directories
      await fs.rm(safePath, { recursive: true, force: true });
      this.changed(serverId, directoryPath);
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

    if (!(await pathExists(safeOldPath))) {
      throw new NotFoundException("File or directory not found");
    }

    const parentDir = resolve(safeOldPath, "..");
    const safeNewPath = join(parentDir, newName);

    // Security check for the new path
    getSafeServerPath(serverId, join(oldPath, "..", newName));
    await assertParentInside(serverId, safeOldPath);
    await assertParentInside(serverId, safeNewPath);

    try {
      await fs.rename(safeOldPath, safeNewPath);
      this.changed(serverId, oldPath);
      this.changed(serverId, join(oldPath, "..", newName));
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

    if (await pathExists(newDirPath)) {
      throw new BadRequestException("Directory already exists");
    }
    await assertRealPathInside(serverId, newDirPath, true);

    try {
      await fs.mkdir(newDirPath, { recursive: true });
      this.changed(serverId, join(parentPath, name));
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to create directory: ${error.message}`,
      );
    }
  }

  async uploadFile(
    serverId: string,
    directoryPath: string,
    file: Express.Multer.File,
  ): Promise<void> {
    try {
      const safeDirPath = getSafeServerPath(serverId, directoryPath);
      const filePath = join(safeDirPath, file.originalname);

      // Security check for the file path
      getSafeServerPath(serverId, join(directoryPath, file.originalname));

      if (await pathExists(filePath)) {
        throw new BadRequestException("File already exists");
      }
      await assertRealPathInside(serverId, filePath, true);

      try {
        await fs.mkdir(safeDirPath, { recursive: true });
        await placeUpload(file, filePath);
        this.changed(serverId, join(directoryPath, file.originalname));
      } catch (error) {
        throw new InternalServerErrorException(
          `Failed to upload file: ${error.message}`,
        );
      }
    } finally {
      await removeUpload(file);
    }
  }

  private changed(serverId: string, path: string): void {
    this.bus.publish("file.changed", { serverId, path });
  }
}
