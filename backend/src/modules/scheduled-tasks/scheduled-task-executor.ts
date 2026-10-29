import { getErrorMessage } from "@/core/utils/error";
import { BackupCreatorService } from "@/modules/backups/backup-creator.service";
import { ScheduledTaskRunsRepository } from "@/modules/database/repositories/scheduled-task-runs.repository";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { InstancesRegistry } from "@/modules/instances/instances.registry";
import { TasksService } from "@/modules/tasks/tasks.service";
import { Injectable, Logger } from "@nestjs/common";
import { BackupType } from "@shared/types/backup.types";
import {
  type IScheduledTask,
  type IScheduledTaskRun,
  ScheduledRunStatus,
  ScheduledRunTrigger,
  SchedulerActionType,
} from "@shared/types/scheduler.types";
import { TaskStatus } from "@shared/types/task.types";
import { canRunAction } from "./action-access";
import { WebhookClient } from "./webhook-client";

const RUNS_HISTORY_LIMIT = 100;

/**
 * Runs a scheduled task's action and records the run in its history
 */
@Injectable()
export class ScheduledTaskExecutor {
  private readonly logger = new Logger(ScheduledTaskExecutor.name);
  // In-flight guard: prevent overlapping executions for the same task
  private readonly runningTasks = new Set<string>();

  constructor(
    private readonly runsRepo: ScheduledTaskRunsRepository,
    private readonly usersRepo: UsersRepository,
    private readonly instancesRegistry: InstancesRegistry,
    private readonly backupCreator: BackupCreatorService,
    private readonly tasksService: TasksService,
    private readonly webhook: WebhookClient,
  ) {}

  async execute(
    task: IScheduledTask,
    trigger: ScheduledRunTrigger,
  ): Promise<IScheduledTaskRun> {
    if (this.runningTasks.has(task.id)) {
      this.logger.warn(
        `Task ${task.id} skipped: previous run still in progress`,
      );
      // Return a synthetic record without persisting
      return {
        id: "skipped",
        taskId: task.id,
        serverId: task.serverId,
        startedAt: Date.now(),
        finishedAt: Date.now(),
        durationMs: 0,
        status: ScheduledRunStatus.FAILED,
        triggeredBy: trigger,
        output: null,
        error: "previous run still in progress",
      };
    }

    this.runningTasks.add(task.id);
    const startedAt = Date.now();
    let status: ScheduledRunStatus = ScheduledRunStatus.SUCCESS;
    let error: string | null = null;
    let output: string | null = null;

    try {
      // Re-check authorization at execution time
      this.assertOwnerStillAuthorized(task);
      output = await this.runAction(task);
    } catch (e: unknown) {
      status = ScheduledRunStatus.FAILED;
      error = getErrorMessage(e).slice(0, 1000);
      this.logger.error(`Task ${task.id} (${task.action}) failed: ${error}`);
    } finally {
      this.runningTasks.delete(task.id);
    }

    const finishedAt = Date.now();
    const run = this.runsRepo.create({
      taskId: task.id,
      serverId: task.serverId,
      startedAt,
      finishedAt,
      durationMs: finishedAt - startedAt,
      status,
      triggeredBy: trigger,
      output,
      error,
    });

    this.runsRepo.pruneOlderThan(task.id, RUNS_HISTORY_LIMIT);

    return run;
  }

  private assertOwnerStillAuthorized(task: IScheduledTask): void {
    const owner = this.usersRepo.findById(task.ownerId);
    if (!owner) throw new Error("Task owner no longer exists");
    if (!canRunAction(owner, task.action, task.serverId)) {
      throw new Error("Task owner can no longer run this action on the server");
    }
  }

  private async runAction(task: IScheduledTask): Promise<string | null> {
    const owner = this.usersRepo.findById(task.ownerId)!;
    const action = task.actionPayload;

    switch (action.type) {
      case SchedulerActionType.SERVER_START: {
        const inst = this.requireInstance(task.serverId);
        const ok = await inst.start();
        if (!ok)
          throw new Error("Server is already running or could not start");
        return "started";
      }
      case SchedulerActionType.SERVER_STOP: {
        const inst = this.requireInstance(task.serverId);
        const ok = await inst.stop(owner);
        if (!ok) throw new Error("Server is not running or stop timed out");
        return "stopped";
      }
      case SchedulerActionType.SERVER_RESTART: {
        const inst = this.requireInstance(task.serverId);
        const ok = await inst.restart(owner);
        if (!ok) throw new Error("Server is not running");
        return "restarted";
      }
      case SchedulerActionType.SERVER_COMMAND: {
        const inst = this.requireInstance(task.serverId);
        const ok = inst.input(action.command, owner);
        if (!ok) throw new Error("Server is not running, cannot send command");
        return `command sent: ${action.command}`;
      }
      case SchedulerActionType.BACKUP_CREATE: {
        const name = formatBackupName(action.nameTemplate);
        const { backup, taskId } = this.backupCreator.create(
          {
            name,
            description: action.description,
            type: BackupType.FULL,
            serverId: task.serverId,
          },
          owner.id,
          "scheduler",
        );
        // The run reports the archive result, not just that it was queued
        const finished = await this.tasksService.waitFor(taskId);
        if (finished.status !== TaskStatus.SUCCESS) {
          throw new Error(finished.error?.message ?? "Backup failed");
        }
        return `backup ${backup.id} created`;
      }
      case SchedulerActionType.HTTP_WEBHOOK:
        return await this.webhook.invoke(action);
      default:
        throw new Error("Unknown action type");
    }
  }

  private requireInstance(serverId: string) {
    const inst = this.instancesRegistry.getByServerId(serverId);
    if (!inst) throw new Error("Server instance is not registered");
    return inst;
  }
}

function formatBackupName(template: string): string {
  const date = new Date().toISOString().replace(/[:.]/g, "-");
  return template.replace(/\{\{\s*date\s*\}\}/g, date).slice(0, 120);
}
