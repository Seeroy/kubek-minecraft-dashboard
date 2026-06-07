import { getErrorMessage } from "@/core/utils/error";
import { getSafeServerPath, getServerPath } from "@/core/utils/serverPath";
import { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import { ServersService } from "@/modules/servers/servers.service";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { TaskType } from "@shared/types/task.types";
import compressing from "compressing";
import { randomUUID } from "crypto";
import { Response } from "express";
import { createReadStream, existsSync, promises as fs } from "fs";
import { join, resolve } from "path";
import { FileManagerService } from "../files/file-manager.service";
import { TasksService } from "../tasks/tasks.service";
import { BackupEntity, BackupStatus } from "./dto/backup.entity";
import {
  BackupFileDto,
  BackupFormat,
  BackupType,
  CreateBackupDto,
  SelectionMode,
} from "./dto/create-backup.dto";
import { BackupsRepository } from "./repositories/backups.repository";

@Injectable()
export class BackupsService {
  private readonly logger = new Logger(BackupsService.name);
  private readonly backupsPath = resolve("./backups");

  // Security limits
  private readonly MAX_BACKUP_SIZE = 10 * 1024 * 1024 * 1024; // 10GB
  private readonly MAX_FILE_COUNT = 10000; // 10k files

  constructor(
    private readonly backupsRepo: BackupsRepository,
    private readonly tasksService: TasksService,
    private readonly fileManager: FileManagerService,
    private readonly bus: ExtensionEventBus,
    private readonly serversService: ServersService,
  ) {}

  /** Resolve a server's display name for task notifications, falling back to its id */
  private getServerName(serverId: string): string {
    return this.serversService.findById(serverId)?.name ?? serverId;
  }

  async onModuleInit() {
    // Ensure backups directory exists
    try {
      await fs.mkdir(this.backupsPath, { recursive: true });
    } catch (error) {
      this.logger.error("Failed to create backups directory", error);
    }
  }

  /**
   * Get all backups
   */
  findAll(): BackupEntity[] {
    return this.backupsRepo.findAll();
  }

  /**
   * Get backup by ID
   */
  findById(id: string): BackupEntity | null {
    return this.backupsRepo.findById(id);
  }

  /**
   * Get backups for a specific server
   */
  findByServerId(serverId: string): BackupEntity[] {
    return this.backupsRepo.findByServerId(serverId);
  }

  /**
   * Create a new backup
   */
  async createBackup(
    dto: CreateBackupDto,
    ownerId?: string,
  ): Promise<{ backup: BackupEntity; taskId: string }> {
    // Validate server exists
    const serverPath = getServerPath(dto.serverId);
    if (!existsSync(serverPath)) {
      throw new NotFoundException("Server not found");
    }

    // Validate selected files for partial backup
    if (
      dto.type === BackupType.PARTIAL &&
      (!dto.selectedFiles || dto.selectedFiles.length === 0)
    ) {
      throw new BadRequestException(
        "Selected files are required for partial backup",
      );
    }

    const backup: BackupEntity = {
      id: randomUUID(),
      name: dto.name,
      description: dto.description,
      type: dto.type,
      status: BackupStatus.CREATING,
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      fileCount: 0,
      totalSize: 0,
      selectedFiles: dto.selectedFiles,
      serverId: dto.serverId,
      ownerId,
      compressionRatio: dto.compressionRatio || 6,
      format: dto.format || BackupFormat.ZIP,
      selectionMode: dto.selectionMode || SelectionMode.ALL,
      globExceptions: dto.globExceptions || [],
    };

    this.backupsRepo.create(backup);
    this.bus.publish("backup.created", {
      serverId: backup.serverId,
      backupId: backup.id,
    });

    const task = await this.tasksService.runTask(
      TaskType.BACKUP_CREATE,
      ownerId || "",
      async (taskId) => {
        await this.performBackupCreation(backup, taskId);
      },
      {
        backupId: backup.id,
        serverId: dto.serverId,
        serverName: this.getServerName(dto.serverId),
      },
    );

    return { backup, taskId: task.id };
  }

  /**
   * Restore a backup
   */
  async restoreBackup(
    backupId: string,
    ownerId?: string,
  ): Promise<{ taskId: string }> {
    const backup = this.backupsRepo.findById(backupId);
    if (!backup) {
      throw new NotFoundException("Backup not found");
    }

    if (backup.status !== BackupStatus.COMPLETED) {
      throw new BadRequestException("Backup is not ready for restoration");
    }

    const task = await this.tasksService.runTask(
      TaskType.BACKUP_RESTORE,
      ownerId || "",
      async (taskId) => {
        await this.performBackupRestore(backup, taskId);
      },
      {
        backupId: backup.id,
        serverId: backup.serverId,
        serverName: this.getServerName(backup.serverId),
      },
    );

    return { taskId: task.id };
  }

  /**
   * Delete a backup
   */
  async deleteBackup(
    backupId: string,
    ownerId?: string,
  ): Promise<{ taskId: string }> {
    const backup = this.backupsRepo.findById(backupId);
    if (!backup) {
      throw new NotFoundException("Backup not found");
    }

    const task = await this.tasksService.runTask(
      TaskType.BACKUP_DELETE,
      ownerId || "",
      async (taskId) => {
        await this.performBackupDeletion(backup, taskId);
      },
      {
        backupId: backup.id,
        serverId: backup.serverId,
        serverName: this.getServerName(backup.serverId),
      },
    );

    return { taskId: task.id };
  }

  /**
   * Download backup file
   */
  async downloadBackup(backupId: string, res: Response): Promise<void> {
    const backup = this.backupsRepo.findById(backupId);
    if (!backup) {
      throw new NotFoundException("Backup not found");
    }

    if (backup.status !== BackupStatus.COMPLETED || !backup.path) {
      throw new BadRequestException("Backup is not available for download");
    }

    if (!existsSync(backup.path)) {
      throw new NotFoundException("Backup file not found");
    }

    // Set headers for download based on format
    const extension = backup.format === BackupFormat.TAR_GZ ? "tar.gz" : "zip";
    const contentType =
      backup.format === BackupFormat.TAR_GZ
        ? "application/x-tar"
        : "application/zip";
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${backup.name}.${extension}"`,
    );

    // Stream the file
    const fileStream = createReadStream(backup.path);
    fileStream.pipe(res);
  }

  /**
   * Perform the actual backup creation
   */
  private async performBackupCreation(
    backup: BackupEntity,
    taskId: string,
  ): Promise<void> {
    const serverPath = getServerPath(backup.serverId);
    const extension = backup.format === BackupFormat.TAR_GZ ? "tar.gz" : "zip";
    const backupFilePath = join(this.backupsPath, `${backup.id}.${extension}`);

    try {
      // Update progress
      this.tasksService.updateTask(taskId, {
        progress: 10,
        message: "Preparing backup...",
      });

      const filesToBackup = await this.getFilesToBackup(backup, serverPath);

      // Validate backup limits
      const totalSize = filesToBackup.reduce((sum, file) => sum + file.size, 0);
      const fileCount = filesToBackup.length;

      if (totalSize > this.MAX_BACKUP_SIZE) {
        throw new BadRequestException(
          `Backup size (${totalSize} bytes) exceeds maximum allowed size (${this.MAX_BACKUP_SIZE} bytes)`,
        );
      }

      if (fileCount > this.MAX_FILE_COUNT) {
        throw new BadRequestException(
          `Backup file count (${fileCount}) exceeds maximum allowed count (${this.MAX_FILE_COUNT})`,
        );
      }

      // Update backup with file count and size
      backup.fileCount = fileCount;
      backup.totalSize = totalSize;
      this.backupsRepo.update(backup);

      this.tasksService.updateTask(taskId, {
        progress: 20,
        message: "Creating archive...",
      });

      await this.createArchive(
        filesToBackup,
        serverPath,
        backupFilePath,
        backup.format || BackupFormat.ZIP,
        taskId,
      );

      // Update backup record
      backup.status = BackupStatus.COMPLETED;
      backup.progress = 100;
      backup.path = backupFilePath;
      backup.updatedAt = Date.now();
      this.backupsRepo.update(backup);

      this.tasksService.updateTask(taskId, {
        progress: 100,
        message: "Backup completed",
      });
    } catch (error: unknown) {
      const normalized =
        error instanceof Error ? error : new Error(getErrorMessage(error));
      // Update backup status to failed
      backup.status = BackupStatus.FAILED;
      backup.updatedAt = Date.now();
      this.backupsRepo.update(backup);

      // Log full error details for debugging
      this.logger.error(
        `Backup creation failed: ${normalized.message}`,
        normalized.stack,
      );

      // Sanitize error message to prevent path disclosure
      const sanitizedMessage = this.sanitizeErrorMessage(normalized.message);
      throw new BadRequestException(
        `Backup creation failed: ${sanitizedMessage}`,
      );
    }
  }

  /**
   * Perform backup restoration
   */
  private async performBackupRestore(
    backup: BackupEntity,
    taskId: string,
  ): Promise<void> {
    const serverPath = getServerPath(backup.serverId);

    if (!backup.path || !existsSync(backup.path)) {
      throw new BadRequestException("Backup file not found");
    }

    // Extract into a staging directory first
    const stagingDir = join(this.backupsPath, `restore-${Date.now()}`);

    try {
      this.tasksService.updateTask(taskId, {
        progress: 10,
        message: "Preparing restoration...",
      });

      await fs.mkdir(stagingDir, { recursive: true });

      // Extract archive into the staging directory
      await this.extractArchive(
        backup.path,
        stagingDir,
        backup.format || BackupFormat.ZIP,
        taskId,
      );

      const sourceRoot = await this.resolveRestoreSource(stagingDir);

      // A full backup represents the complete server state, so clear the
      // server directory first to drop files that no longer exist in the
      // backup. Partial backups only overwrite the files they contain
      if (backup.type === BackupType.FULL) {
        this.tasksService.updateTask(taskId, {
          progress: 92,
          message: "Clearing server files...",
        });
        await this.clearDirectory(serverPath);
      }

      this.tasksService.updateTask(taskId, {
        progress: 95,
        message: "Restoring files...",
      });

      // Copy extracted files over the server directory, overwriting originals
      await fs.mkdir(serverPath, { recursive: true });
      await this.copyDirectoryRecursive(sourceRoot, serverPath);

      this.tasksService.updateTask(taskId, {
        progress: 100,
        message: "Restoration completed",
      });
    } catch (error: unknown) {
      const normalized =
        error instanceof Error ? error : new Error(getErrorMessage(error));
      this.logger.error(
        `Backup restoration failed: ${normalized.message}`,
        normalized.stack,
      );
      const sanitizedMessage = this.sanitizeErrorMessage(normalized.message);
      throw new BadRequestException(
        `Backup restoration failed: ${sanitizedMessage}`,
      );
    } finally {
      // Always clean up the staging directory
      try {
        await fs.rm(stagingDir, { recursive: true, force: true });
      } catch (cleanupError) {
        this.logger.warn(
          "Failed to clean up restore staging directory",
          cleanupError,
        );
      }
    }
  }

  /**
   * Resolve the directory that actually holds the backed-up files after
   * extraction
   */
  private async resolveRestoreSource(stagingDir: string): Promise<string> {
    const entries = await fs.readdir(stagingDir, { withFileTypes: true });
    if (
      entries.length === 1 &&
      entries[0].isDirectory() &&
      entries[0].name.startsWith("temp-")
    ) {
      return join(stagingDir, entries[0].name);
    }
    return stagingDir;
  }

  /**
   * Remove all contents of a directory while keeping the directory itself
   */
  private async clearDirectory(dir: string): Promise<void> {
    if (!existsSync(dir)) {
      return;
    }
    const entries = await fs.readdir(dir);
    await Promise.all(
      entries.map((entry) =>
        fs.rm(join(dir, entry), { recursive: true, force: true }),
      ),
    );
  }

  /**
   * Perform backup deletion
   */
  private async performBackupDeletion(
    backup: BackupEntity,
    taskId: string,
  ): Promise<void> {
    try {
      this.tasksService.updateTask(taskId, {
        progress: 50,
        message: "Deleting backup files...",
      });

      if (backup.path && existsSync(backup.path)) {
        await fs.unlink(backup.path);
      }

      this.backupsRepo.delete(backup.id);

      this.tasksService.updateTask(taskId, {
        progress: 100,
        message: "Backup deleted",
      });
    } catch (error: unknown) {
      const normalized =
        error instanceof Error ? error : new Error(getErrorMessage(error));
      this.logger.error(
        `Backup deletion failed: ${normalized.message}`,
        normalized.stack,
      );
      const sanitizedMessage = this.sanitizeErrorMessage(normalized.message);
      throw new BadRequestException(
        `Backup deletion failed: ${sanitizedMessage}`,
      );
    }
  }

  /**
   * Get list of files to backup
   */
  private async getFilesToBackup(
    backup: BackupEntity,
    serverPath: string,
  ): Promise<
    Array<{
      path: string;
      size: number;
    }>
  > {
    if (backup.type === BackupType.FULL) {
      return await this.getAllServerFiles(serverPath);
    } else {
      return await this.getSelectedFiles(
        backup.selectedFiles || [],
        backup.serverId,
        serverPath,
      );
    }
  }

  /**
   * Get all files in server directory
   */
  private async getAllServerFiles(
    serverPath: string,
  ): Promise<Array<{ path: string; size: number }>> {
    const files: Array<{ path: string; size: number }> = [];

    const walkDir = async (dir: string, relativePath: string = "") => {
      const items = await fs.readdir(dir);

      for (const item of items) {
        const fullPath = join(dir, item);
        const relPath = join(relativePath, item);
        const stats = await fs.lstat(fullPath);

        if (stats.isDirectory()) {
          await walkDir(fullPath, relPath);
        } else if (stats.isFile()) {
          files.push({ path: relPath, size: stats.size });
        }
      }
    };

    await walkDir(serverPath);
    return files;
  }

  /**
   * Get selected files for partial backup
   */
  private async getSelectedFiles(
    selectedFiles: BackupFileDto[],
    serverId: string,
    serverPath: string,
  ): Promise<
    Array<{
      path: string;
      size: number;
    }>
  > {
    const files: Array<{ path: string; size: number }> = [];

    for (const selectedFile of selectedFiles) {
      const safePath = getSafeServerPath(serverId, selectedFile.path);
      const stats = await fs.lstat(safePath);

      if (stats.isFile()) {
        files.push({ path: selectedFile.path, size: stats.size });
      } else if (stats.isDirectory()) {
        // For directories, get all files recursively
        const dirFiles = await this.getAllServerFiles(safePath);
        files.push(
          ...dirFiles.map((f) => ({
            ...f,
            path: join(selectedFile.path, f.path),
          })),
        );
      }
    }

    return files;
  }

  /**
   * Create archive (ZIP or TAR_GZ)
   */
  private async createArchive(
    files: Array<{ path: string; size: number }>,
    serverPath: string,
    outputPath: string,
    format: BackupFormat,
    taskId: string,
  ): Promise<void> {
    // Create a temporary directory for staging files
    const tempDir = join(this.backupsPath, `temp-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // Copy selected files to temp directory
      let processed = 0;
      for (const file of files) {
        const srcPath = join(serverPath, file.path);
        const destPath = join(tempDir, file.path);

        // Ensure destination directory exists
        await fs.mkdir(resolve(destPath, ".."), { recursive: true });

        await fs.copyFile(srcPath, destPath);

        processed++;
        const percentage = Math.min(80, 20 + (processed / files.length) * 60);
        this.tasksService.updateTask(taskId, {
          progress: Math.round(percentage),
          message: `Copying files... ${processed}/${files.length}`,
        });
      }

      // Compress the temp directory to the final archive
      this.tasksService.updateTask(taskId, {
        progress: 85,
        message: "Compressing archive...",
      });

      // ignoreBase keeps files at the archive root instead of nesting them
      // under the staging folder name
      if (format === BackupFormat.ZIP) {
        await compressing.zip.compressDir(tempDir, outputPath, {
          ignoreBase: true,
        });
      } else if (format === BackupFormat.TAR_GZ) {
        await compressing.tgz.compressDir(tempDir, outputPath, {
          ignoreBase: true,
        });
      }

      this.tasksService.updateTask(taskId, {
        progress: 90,
        message: "Finalizing archive...",
      });
    } finally {
      // Clean up temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        this.logger.warn("Failed to clean up temp directory", cleanupError);
      }
    }
  }

  /**
   * Extract archive (ZIP or TAR_GZ)
   */
  private async extractArchive(
    archivePath: string,
    extractPath: string,
    format: BackupFormat,
    taskId: string,
  ): Promise<void> {
    this.tasksService.updateTask(taskId, {
      progress: 20,
      message: "Extracting archive...",
    });

    if (format === BackupFormat.ZIP) {
      await compressing.zip.uncompress(archivePath, extractPath);
    } else if (format === BackupFormat.TAR_GZ) {
      await compressing.tgz.uncompress(archivePath, extractPath);
    }

    this.tasksService.updateTask(taskId, {
      progress: 90,
      message: "Extraction completed",
    });
  }

  /**
   * Recursively copy directory
   */
  private async copyDirectoryRecursive(
    src: string,
    dest: string,
  ): Promise<void> {
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      if (entry.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true });
        await this.copyDirectoryRecursive(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  // Sanitize error messages to prevent path disclosure
  private sanitizeErrorMessage(message: string): string {
    // Remove any file paths from error messages
    return message
      .replace(/\/[^\s]+/g, "[REDACTED]") // Unix-style paths
      .replace(/[A-Za-z]:[^\s]+/g, "[REDACTED]") // Windows-style paths
      .replace(/\\[^\s]+/g, "[REDACTED]") // Backslash paths
      .replace(/\.\.[^\s]*/g, "[REDACTED]") // Parent directory references
      .replace(/file:\/\/[^\s]*/g, "[REDACTED]") // File URLs
      .replace(/backup-[a-f0-9-]+/g, "[BACKUP_ID]"); // Backup IDs
  }
}
