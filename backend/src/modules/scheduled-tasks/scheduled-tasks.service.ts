import { getErrorMessage } from "@/core/utils/error";
import { ScheduledTaskRunsRepository } from "@/modules/database/repositories/scheduled-task-runs.repository";
import { ScheduledTasksRepository } from "@/modules/database/repositories/scheduled-tasks.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import {
  IScheduledTask,
  IScheduledTaskRun,
  ScheduledRunStatus,
  ScheduledRunTrigger,
} from "@shared/types/scheduler.types";
import type { IUser } from "@shared/types/user.types";
import { CronJob } from "cron";
import { type CronHandlers, CronRegistrar } from "./cron-registrar";
import {
  CreateScheduledTaskDto,
  PreviewCronDto,
  UpdateScheduledTaskDto,
} from "./dto/scheduled-task.dto";
import {
  computeNextRun,
  mergeForUpdate,
  normalizeAction,
  normalizeSchedule,
} from "./schedule-normalizer";
import { assertCanRunAction } from "./action-access";
import { ScheduledTaskExecutor } from "./scheduled-task-executor";

@Injectable()
export class ScheduledTasksService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(ScheduledTasksService.name);

  private readonly cronHandlers: CronHandlers = {
    fire: (task, trigger) => {
      this.executor
        .execute(task, trigger)
        .catch((e) =>
          this.logger.error(
            `Task ${task.id} firing failed: ${getErrorMessage(e)}`,
          ),
        );
    },
    onceFired: (task) => {
      this.tasksRepo.update(task.id, { enabled: false });
    },
  };

  constructor(
    private readonly tasksRepo: ScheduledTasksRepository,
    private readonly runsRepo: ScheduledTaskRunsRepository,
    private readonly serversRepo: ServersRepository,
    private readonly executor: ScheduledTaskExecutor,
    private readonly cron: CronRegistrar,
  ) {}

  onApplicationBootstrap() {
    const enabled = this.tasksRepo.findEnabled();
    for (const task of enabled) {
      try {
        this.cron.register(task, this.cronHandlers);
      } catch (e: unknown) {
        this.logger.error(
          `Failed to register scheduled task ${task.id}: ${getErrorMessage(e)}`,
        );
      }
    }
    this.logger.log(`Registered ${enabled.length} scheduled task(s)`);
  }

  onModuleDestroy() {
    this.cron.unregisterAll();
  }

  ///
  /// Public API
  ///

  findByServerId(serverId: string): IScheduledTask[] {
    return this.tasksRepo
      .findByServerId(serverId)
      .map((t) => this.withNextRun(t));
  }

  findById(id: string): IScheduledTask {
    const task = this.tasksRepo.findById(id);
    if (!task) throw new NotFoundException("Scheduled task not found");
    return this.withNextRun(task);
  }

  create(dto: CreateScheduledTaskDto, user: IUser): IScheduledTask {
    const server = this.serversRepo.findById(dto.serverId);
    if (!server) throw new NotFoundException("Server not found");

    const { cronExpression, runAt, schedulePayload } = normalizeSchedule(dto);
    const actionPayload = normalizeAction(dto.action);
    assertCanRunAction(user, dto.action.type, dto.serverId);

    const created = this.tasksRepo.create({
      serverId: dto.serverId,
      name: dto.name.trim(),
      enabled: dto.enabled,
      mode: dto.mode,
      cronExpression,
      runAt,
      timezone: dto.timezone ?? null,
      schedulePayload,
      action: dto.action.type,
      actionPayload,
      ownerId: user.id,
    });

    if (created.enabled) {
      this.cron.register(created, this.cronHandlers);
    }

    return this.withNextRun(created);
  }

  update(id: string, dto: UpdateScheduledTaskDto, user: IUser): IScheduledTask {
    const existing = this.tasksRepo.findById(id);
    if (!existing) throw new NotFoundException("Scheduled task not found");

    const merged = mergeForUpdate(existing, dto);
    assertCanRunAction(
      user,
      merged.action ?? existing.action,
      existing.serverId,
    );
    const updated = this.tasksRepo.update(id, merged);
    if (!updated) throw new NotFoundException("Scheduled task not found");

    this.cron.unregister(updated.id);
    if (updated.enabled) {
      this.cron.register(updated, this.cronHandlers);
    }

    return this.withNextRun(updated);
  }

  delete(id: string): void {
    const existing = this.tasksRepo.findById(id);
    if (!existing) throw new NotFoundException("Scheduled task not found");
    this.cron.unregister(id);
    this.tasksRepo.delete(id);
  }

  toggle(id: string): IScheduledTask {
    const existing = this.tasksRepo.findById(id);
    if (!existing) throw new NotFoundException("Scheduled task not found");

    const updated = this.tasksRepo.update(id, { enabled: !existing.enabled })!;
    this.cron.unregister(id);
    if (updated.enabled) {
      this.cron.register(updated, this.cronHandlers);
    }
    return this.withNextRun(updated);
  }

  async runNow(id: string): Promise<IScheduledTaskRun> {
    const task = this.tasksRepo.findById(id);
    if (!task) throw new NotFoundException("Scheduled task not found");
    return this.executor.execute(task, ScheduledRunTrigger.MANUAL);
  }

  ///
  /// Runs / history
  ///

  listRuns(
    serverId: string,
    opts: {
      taskId?: string;
      status?: ScheduledRunStatus;
      limit?: number;
      offset?: number;
    },
  ) {
    return {
      items: this.runsRepo.findByServerId(serverId, opts),
      total: this.runsRepo.countByServerId(serverId, opts),
    };
  }

  listTaskRuns(
    taskId: string,
    opts: { limit?: number; offset?: number },
  ): IScheduledTaskRun[] {
    return this.runsRepo.findByTaskId(taskId, opts);
  }

  ///
  /// Cron preview
  ///

  previewCron(dto: PreviewCronDto): { nextRuns: number[] } {
    try {
      const job = new CronJob(
        dto.expression,
        () => undefined,
        null,
        false,
        dto.timezone || undefined,
      );
      const dates = job.nextDates(5);
      return { nextRuns: dates.map((d) => d.toJSDate().getTime()) };
    } catch (e: unknown) {
      throw new BadRequestException(
        `Invalid cron expression: ${getErrorMessage(e)}`,
      );
    }
  }

  private withNextRun(task: IScheduledTask): IScheduledTask {
    return { ...task, nextRunAt: computeNextRun(task) };
  }
}
