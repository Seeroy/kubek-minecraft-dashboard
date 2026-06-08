import { TaskErrorCode } from "@/core/errors/error-codes";
import { getErrorMessage } from "@/core/utils/error";
import { FileManagerService } from "@/modules/files/file-manager.service";
import { TasksService } from "@/modules/tasks/tasks.service";
import { Injectable, Logger } from "@nestjs/common";
import { ITask, TaskStatus, TaskType } from "@shared/types/task.types";

@Injectable()
export class FilesTasksService {
  private readonly logger = new Logger(FilesTasksService.name);

  constructor(
    private readonly tasksService: TasksService,
    private readonly fileManager: FileManagerService,
  ) {}

  async deletePathsTask(
    serverId: string,
    paths: string[],
    ownerId: string,
  ): Promise<{ task: ITask }> {
    const taskId = this.tasksService.createTask(
      TaskType.FILES_DELETE,
      { serverId, count: paths.length },
      ownerId,
    );
    this.tasksService.updateTask(taskId, {
      status: TaskStatus.RUNNING,
      message: "Starting...",
    });

    // Run the actual work in background
    void this.runDeletion(taskId, serverId, paths);

    const task = this.tasksService.getTask(taskId)!;
    return { task };
  }

  async extractArchiveTask(
    serverId: string,
    archivePath: string,
    ownerId: string,
  ): Promise<{ task: ITask }> {
    const taskId = this.tasksService.createTask(
      TaskType.FILES_EXTRACT,
      { serverId, archivePath },
      ownerId,
    );
    this.tasksService.updateTask(taskId, {
      status: TaskStatus.RUNNING,
      message: "Extracting archive...",
    });

    void this.runExtract(taskId, serverId, archivePath);

    const task = this.tasksService.getTask(taskId)!;
    return { task };
  }

  async createArchiveTask(
    serverId: string,
    paths: string[],
    destPath: string,
    archiveName: string,
    ownerId: string,
  ): Promise<{ task: ITask }> {
    const taskId = this.tasksService.createTask(
      TaskType.FILES_ARCHIVE,
      { serverId, count: paths.length, archiveName },
      ownerId,
    );
    this.tasksService.updateTask(taskId, {
      status: TaskStatus.RUNNING,
      message: "Preparing archive...",
    });

    void this.runArchive(taskId, serverId, paths, destPath, archiveName);

    const task = this.tasksService.getTask(taskId)!;
    return { task };
  }

  private async runDeletion(
    taskId: string,
    serverId: string,
    paths: string[],
  ): Promise<void> {
    try {
      await this.fileManager.deletePaths(
        serverId,
        paths,
        (done, total, name) => {
          const progress = Math.min(99, Math.round((done / total) * 100));
          this.tasksService.updateTask(taskId, {
            progress,
            message: `Deleting ${done}/${total}: ${name}`,
          });
        },
      );
      this.tasksService.updateTask(taskId, {
        status: TaskStatus.SUCCESS,
        progress: 100,
        message: "Completed",
      });
    } catch (err: unknown) {
      const normalized =
        err instanceof Error ? err : new Error(getErrorMessage(err));
      this.logger.error(
        `Files delete task ${taskId} failed: ${normalized.message}`,
        normalized.stack,
      );
      this.tasksService.updateTask(taskId, {
        status: TaskStatus.FAILED,
        error: {
          code: TaskErrorCode.TASK_ERROR,
          message: normalized.message,
        },
      });
    }
  }

  private async runExtract(
    taskId: string,
    serverId: string,
    archivePath: string,
  ): Promise<void> {
    try {
      const result = await this.fileManager.extractZipArchive(
        serverId,
        archivePath,
        (done, _total, name) => {
          const progress = Math.min(
            95,
            Math.round(95 * (1 - 1 / (1 + done / 25))),
          );
          this.tasksService.updateTask(taskId, {
            progress,
            message: `Extracting ${done}: ${name}`,
          });
        },
      );
      this.tasksService.updateTask(taskId, {
        status: TaskStatus.SUCCESS,
        progress: 100,
        message: "Completed",
        result,
      });
    } catch (err: unknown) {
      const normalized =
        err instanceof Error ? err : new Error(getErrorMessage(err));
      this.logger.error(
        `Files extract task ${taskId} failed: ${normalized.message}`,
        normalized.stack,
      );
      this.tasksService.updateTask(taskId, {
        status: TaskStatus.FAILED,
        error: {
          code: TaskErrorCode.TASK_ERROR,
          message: normalized.message,
        },
      });
    }
  }

  private async runArchive(
    taskId: string,
    serverId: string,
    paths: string[],
    destPath: string,
    archiveName: string,
  ): Promise<void> {
    try {
      const result = await this.fileManager.createZipArchive(
        serverId,
        paths,
        destPath,
        archiveName,
        (done, total, name) => {
          // Reserve final 5% for stream flush + atomic rename
          const progress = Math.min(95, Math.round((done / total) * 95));
          this.tasksService.updateTask(taskId, {
            progress,
            message: `Compressing ${done}/${total}: ${name}`,
          });
        },
      );
      this.tasksService.updateTask(taskId, {
        status: TaskStatus.SUCCESS,
        progress: 100,
        message: "Completed",
        result,
      });
    } catch (err: unknown) {
      const normalized =
        err instanceof Error ? err : new Error(getErrorMessage(err));
      this.logger.error(
        `Files archive task ${taskId} failed: ${normalized.message}`,
        normalized.stack,
      );
      this.tasksService.updateTask(taskId, {
        status: TaskStatus.FAILED,
        error: {
          code: TaskErrorCode.TASK_ERROR,
          message: normalized.message,
        },
      });
    }
  }
}
