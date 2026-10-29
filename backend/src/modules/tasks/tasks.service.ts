import { TaskErrorCode } from "@/core/errors/error-codes";
import { AppEventsService } from "@/core/events/app-events.service";
import { getErrorMessage } from "@/core/utils/error";
import { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import { TasksEventsService } from "@/ws/services/task-events.service";
import { HttpException, Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ITask, TaskStatus, TaskType } from "@shared/types/task.types";
import { randomUUID } from "crypto";

const FINISHED: TaskStatus[] = [
  TaskStatus.SUCCESS,
  TaskStatus.FAILED,
  TaskStatus.CANCELLED,
];

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  private readonly tasks = new Map<string, ITask>();
  private readonly TTL = 1000 * 60 * 10;
  private readonly waiters = new Map<string, ((task: ITask) => void)[]>();
  private readonly watchers = new Map<string, Set<(task: ITask) => void>>();

  constructor(
    private readonly tasksEvents: TasksEventsService,
    private readonly bus: ExtensionEventBus,
    private readonly events: AppEventsService,
  ) {}

  /** Calls back on every update of a task until the returned function runs */
  watch(id: string, onUpdate: (task: ITask) => void): () => void {
    const set = this.watchers.get(id) ?? new Set();
    set.add(onUpdate);
    this.watchers.set(id, set);
    return () => {
      set.delete(onUpdate);
      if (set.size === 0) this.watchers.delete(id);
    };
  }

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
    for (const watcher of this.watchers.get(id) ?? []) watcher(updated);

    if (FINISHED.includes(updated.status)) this.resolveWaiters(updated);

    // result carries task meta
    if (updated.status === TaskStatus.SUCCESS) {
      this.tasksEvents.emitTaskDone(updated);
      this.events.emit("task.finished", { task: updated });
      this.bus.publish("task.completed", {
        taskId: id,
        status: "success",
        result: updated.meta,
      });
    } else if (updated.status === TaskStatus.FAILED) {
      this.tasksEvents.emitTaskFailed(updated);
      this.events.emit("task.finished", { task: updated });
      this.bus.publish("task.completed", {
        taskId: id,
        status: "failed",
        result: updated.meta,
      });
    } else if (updated.status === TaskStatus.CANCELLED) {
      this.events.emit("task.finished", { task: updated });
    }

    return updated;
  }

  /** Resolves once the task succeeds, fails or is cancelled */
  waitFor(id: string): Promise<ITask> {
    const task = this.tasks.get(id);
    if (!task) return Promise.reject(new Error(`Task ${id} not found`));
    if (FINISHED.includes(task.status)) return Promise.resolve(task);
    return new Promise((resolve) => {
      this.waiters.set(id, [...(this.waiters.get(id) ?? []), resolve]);
    });
  }

  private resolveWaiters(task: ITask): void {
    const waiters = this.waiters.get(task.id);
    this.waiters.delete(task.id);
    waiters?.forEach((resolve) => resolve(task));
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

  /** Start a task in the background, progress and the outcome go out as task updates */
  runTask<T>(
    type: TaskType,
    ownerId: string,
    fn: (taskId: string) => Promise<T>,
    meta?: any,
  ): ITask {
    const id = this.createTask(type, meta, ownerId);
    this.updateTask(id, { status: TaskStatus.RUNNING });

    fn(id).then(
      (result) =>
        this.updateTask(id, {
          status: TaskStatus.SUCCESS,
          progress: 100,
          result,
          message: "Completed",
        }),
      (err: unknown) =>
        this.updateTask(id, {
          status: TaskStatus.FAILED,
          error: {
            code: errorCode(err) ?? TaskErrorCode.TASK_ERROR,
            message: getErrorMessage(err),
          },
        }),
    );

    return this.getTask(id)!;
  }
}

// Domain errors keep their code so the client can show its own text
function errorCode(err: unknown): string | undefined {
  const response =
    err instanceof HttpException ? err.getResponse() : (err as object | null);
  const code = (response as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : undefined;
}
