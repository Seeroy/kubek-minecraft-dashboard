import { TaskErrorCode } from "@/core/errors/error-codes";
import { getErrorMessage } from "@/core/utils/error";
import { AccountsService } from "@/modules/accounts/accounts.service";
import { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import { NotificationService } from "@/modules/telegram-bot/notification.service";
import { TasksEventsService } from "@/ws/services/task-events.service";
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ITask, TaskStatus, TaskType } from "@shared/types/task.types";
import { randomUUID } from "crypto";

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  private readonly tasks = new Map<string, ITask>();
  private readonly TTL = 1000 * 60 * 10;

  constructor(
    private readonly tasksEvents: TasksEventsService,
    private readonly notifications: NotificationService,
    private readonly accounts: AccountsService,
    private readonly bus: ExtensionEventBus,
  ) {}

  /** Create a task */
  createTask(type: TaskType, meta?: any, ownerId?: string): string {
    const id = randomUUID();
    const task: ITask = {
      id,
      type,
      status: TaskStatus.PENDING,
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ownerId,
      meta,
    };
    this.tasks.set(id, task);
    this.logger.debug(`Task created: ${id} (${type})`);
    this.tasksEvents.emitTaskUpdate(task);
    this.bus.publish("task.created", { taskId: id, type });
    return id;
  }

  /** Update a task */
  updateTask(id: string, data: Partial<ITask>): ITask | null {
    const task = this.tasks.get(id);
    if (!task) return null;

    const updated: ITask = { ...task, ...data, updatedAt: Date.now() };
    this.tasks.set(id, updated);

    this.tasksEvents.emitTaskUpdate(updated);

    // result carries task meta
    if (updated.status === TaskStatus.SUCCESS) {
      this.tasksEvents.emitTaskDone(updated);
      this.notifyOwner(updated);
      this.bus.publish("task.completed", {
        taskId: id,
        status: "success",
        result: updated.meta,
      });
    } else if (updated.status === TaskStatus.FAILED) {
      this.tasksEvents.emitTaskFailed(updated);
      this.notifyOwner(updated);
      this.bus.publish("task.completed", {
        taskId: id,
        status: "failed",
        result: updated.meta,
      });
    } else if (updated.status === TaskStatus.CANCELLED) {
      this.notifyOwner(updated);
    }

    return updated;
  }

  private notifyOwner(task: ITask): void {
    if (!task.ownerId) return;
    // never block task pipeline on Telegram delivery
    void Promise.resolve().then(async () => {
      try {
        const user = this.accounts.findById(task.ownerId!);
        if (!user || !user.notifyTaskResults) return;
        const status =
          task.status === TaskStatus.SUCCESS
            ? "success"
            : task.status === TaskStatus.FAILED
              ? "failed"
              : "cancelled";
        await this.notifications.sendTaskNotification(task.ownerId!, {
          status,
          type: task.type,
          durationMs: Math.max(0, task.updatedAt - task.createdAt),
          serverName: task.meta?.serverName,
          pluginName: task.meta?.pluginName,
          errorMessage: task.error?.message,
        });
      } catch (err) {
        this.logger.warn(
          `Failed to send task notification: ${getErrorMessage(err)}`,
        );
      }
    });
  }

  /** Get a task by id */
  getTask(id: string): ITask | null {
    return this.tasks.get(id) || null;
  }

  /** Get all tasks */
  getAll(): ITask[] {
    return Array.from(this.tasks.values());
  }

  /** Delete a task */
  remove(id: string): boolean {
    const ok = this.tasks.delete(id);
    if (ok) this.logger.debug(`Task removed: ${id}`);
    return ok;
  }

  /** Remove finished tasks older than the TTL */
  @Cron(CronExpression.EVERY_MINUTE)
  cleanupCompleted(): void {
    const now = Date.now();
    for (const [id, task] of this.tasks.entries()) {
      if (
        [TaskStatus.SUCCESS, TaskStatus.FAILED, TaskStatus.CANCELLED].includes(
          task.status,
        ) &&
        now - task.updatedAt > this.TTL
      ) {
        this.tasks.delete(id);
        this.logger.debug(`Task TTL expired and removed: ${id}`);
      }
    }
  }

  /** Run a task with automatic status transitions */
  async runTask<T>(
    type: TaskType,
    ownerId: string,
    fn: (taskId: string) => Promise<T>,
    meta?: any,
  ): Promise<ITask> {
    const id = this.createTask(type, meta, ownerId);
    this.updateTask(id, { status: TaskStatus.RUNNING });

    try {
      const result = await fn(id);
      this.updateTask(id, {
        status: TaskStatus.SUCCESS,
        progress: 100,
        result,
        message: "Completed",
      });
    } catch (err: unknown) {
      this.updateTask(id, {
        status: TaskStatus.FAILED,
        error: {
          code: TaskErrorCode.TASK_ERROR,
          message: getErrorMessage(err),
        },
      });
    }

    return this.getTask(id)!;
  }
}
