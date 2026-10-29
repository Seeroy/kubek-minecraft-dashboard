import { TaskErrorCode } from "@/core/errors/error-codes";
import { download, progressThrottle } from "@/core/utils/download";
import { getErrorMessage } from "@/core/utils/error";
import { TasksService } from "@/modules/tasks/tasks.service";
import { Injectable, Logger } from "@nestjs/common";
import { TaskStatus, TaskSteps } from "@shared/types/task.types";
import decompress from "@xhmikosr/decompress";
import * as fs from "fs/promises";
import * as path from "path";
import { JavaDiscovery } from "./java-discovery.service";
import { managedJavaPaths } from "./java-platform";

export interface JavaInstallResult {
  success: boolean;
  error?: string;
  path?: string;
}

export interface JavaInstallOptions {
  /** false means the caller sets the final task status */
  manageTaskLifecycle?: boolean;
}

const PROGRESS_INTERVAL_MS = 200;

/**
 * Downloads an Adoptium runtime into binaries/java and reports it on a task
 */
@Injectable()
export class JavaInstaller {
  private readonly logger = new Logger(JavaInstaller.name);

  constructor(
    private readonly tasksService: TasksService,
    private readonly discovery: JavaDiscovery,
  ) {}

  async install(
    version: string,
    taskId?: string,
    onLog?: (line: string) => void,
    options?: JavaInstallOptions,
  ): Promise<JavaInstallResult> {
    const manageLifecycle = options?.manageTaskLifecycle ?? true;

    try {
      const existing = await this.discovery.getManagedJavaPath(version);
      if (existing) {
        if (taskId && manageLifecycle) this.completeTask(taskId);
        return { success: true, path: existing };
      }

      const target = managedJavaPaths(version);
      this.logger.log(`Java ${version} download URL: ${target.url}`);

      if (taskId) {
        this.tasksService.updateTask(taskId, {
          step: TaskSteps.DOWNLOADING_JAVA,
          progress: 0,
        });
      }

      await fs.mkdir(path.dirname(target.downloadPath), { recursive: true });
      onLog?.(
        `[Kubek] Java ${version} is not installed - starting download...`,
      );
      await this.downloadArchive(version, target, taskId, onLog);
      if (taskId) this.tasksService.updateTask(taskId, { progress: 100 });
      onLog?.(`[Kubek] Java ${version} downloaded, unpacking...`);

      if (taskId)
        this.tasksService.updateTask(taskId, {
          step: TaskSteps.UNPACKING_JAVA,
          progress: 0,
        });

      // Surface extraction failures instead of hanging the install forever
      await decompress(target.downloadPath, target.extractPath);
      onLog?.(`[Kubek] Java ${version} unpacked successfully`);

      const javaPath = await this.discovery.findJavaBinaryInDirectory(
        target.extractPath,
      );
      if (!javaPath) {
        return this.failTask(
          taskId,
          "Failed to find Java executable after extraction",
          manageLifecycle,
        );
      }

      await fs.unlink(target.downloadPath);

      if (taskId && manageLifecycle) this.completeTask(taskId);
      return { success: true, path: javaPath };
    } catch (error) {
      this.logger.error(
        `Failed to install Java ${version}: ${getErrorMessage(error)}`,
      );
      return this.failTask(
        taskId,
        (error as Error)?.message || "Failed to install Java version",
        manageLifecycle,
      );
    }
  }

  private async downloadArchive(
    version: string,
    target: { url: string; downloadPath: string },
    taskId: string | undefined,
    onLog: ((line: string) => void) | undefined,
  ): Promise<void> {
    const ready = progressThrottle(PROGRESS_INTERVAL_MS);
    let lastLoggedPercent = -1;

    await download({
      url: target.url,
      dest: target.downloadPath,
      onProgress: (progress) => {
        if (taskId && ready()) {
          this.tasksService.updateTask(taskId, { progress });
        }
        // Mirror download progress to the server log in coarse 10% increments
        const stepped = Math.floor(progress / 10) * 10;
        if (
          onLog &&
          stepped > lastLoggedPercent &&
          stepped >= 0 &&
          stepped <= 100
        ) {
          lastLoggedPercent = stepped;
          onLog(`[Kubek] Downloading Java ${version}: ${stepped}%`);
        }
      },
    });
  }

  private completeTask(taskId: string): void {
    this.tasksService.updateTask(taskId, {
      status: TaskStatus.SUCCESS,
      step: TaskSteps.COMPLETED,
      progress: 100,
    });
  }

  /** Mark the install task as FAILED */
  private failTask(
    taskId: string | undefined,
    message: string,
    manageLifecycle = true,
  ): { success: false; error: string } {
    if (taskId && manageLifecycle) {
      this.tasksService.updateTask(taskId, {
        status: TaskStatus.FAILED,
        step: TaskSteps.FAILED,
        error: { code: TaskErrorCode.JAVA_INSTALL_ERROR, message },
      });
    }
    return { success: false, error: message };
  }
}
