import { getErrorMessage } from "@/core/utils/error";
import { BackupsService } from "@/modules/backups/backups.service";
import { BackupType } from "@/modules/backups/dto/create-backup.dto";
import { ScheduledTaskRunsRepository } from "@/modules/database/repositories/scheduled-task-runs.repository";
import { ScheduledTasksRepository } from "@/modules/database/repositories/scheduled-tasks.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { InstancesRegistry } from "@/modules/instances/instances.registry";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import {
  IScheduledTask,
  IScheduledTaskRun,
  IntervalUnit,
  ScheduleMode,
  SchedulePayload,
  ScheduledRunStatus,
  ScheduledRunTrigger,
  SchedulerActionPayload,
  SchedulerActionType,
  SimpleScheduleKind,
} from "@shared/types/scheduler.types";
import type {
  IUser,
  UserPermissions as UserPermissionsType,
} from "@shared/types/user.types";
import { UserPermissions } from "@shared/types/user.types";
import { CronJob } from "cron";
import {
  CreateScheduledTaskDto,
  PreviewCronDto,
  UpdateScheduledTaskDto,
} from "./dto/scheduled-task.dto";

const RUNS_HISTORY_LIMIT = 100;
const WEBHOOK_TIMEOUT_MS = 10_000;
const WEBHOOK_MAX_BODY_BYTES = 16 * 1024;

const PRIVATE_HOST_REGEX =
  /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|::1|fe80::|fc00::)/i;

@Injectable()
export class ScheduledTasksService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(ScheduledTasksService.name);
  // In-flight guard: prevent overlapping executions for the same task
  private readonly runningTasks = new Set<string>();

  constructor(
    private readonly tasksRepo: ScheduledTasksRepository,
    private readonly runsRepo: ScheduledTaskRunsRepository,
    private readonly serversRepo: ServersRepository,
    private readonly usersRepo: UsersRepository,
    private readonly instancesRegistry: InstancesRegistry,
    private readonly backupsService: BackupsService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onApplicationBootstrap() {
    const enabled = this.tasksRepo.findEnabled();
    for (const task of enabled) {
      try {
        this.registerCronJob(task);
      } catch (e: unknown) {
        this.logger.error(
          `Failed to register scheduled task ${task.id}: ${getErrorMessage(e)}`,
        );
      }
    }
    this.logger.log(`Registered ${enabled.length} scheduled task(s)`);
  }

  onModuleDestroy() {
    for (const name of Array.from(
      this.schedulerRegistry.getCronJobs().keys(),
    )) {
      if (name.startsWith("scheduled-task:")) {
        try {
          this.schedulerRegistry.deleteCronJob(name);
        } catch {
          // ignore
        }
      }
    }
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

    const { cronExpression, runAt, schedulePayload } =
      this.canonicalizeSchedule(dto);
    const actionPayload = this.canonicalizeAction(dto.action);

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
      this.registerCronJob(created);
    }

    return this.withNextRun(created);
  }

  update(id: string, dto: UpdateScheduledTaskDto): IScheduledTask {
    const existing = this.tasksRepo.findById(id);
    if (!existing) throw new NotFoundException("Scheduled task not found");

    const merged = this.mergeForUpdate(existing, dto);
    const updated = this.tasksRepo.update(id, merged);
    if (!updated) throw new NotFoundException("Scheduled task not found");

    this.unregisterCronJob(updated.id);
    if (updated.enabled) {
      this.registerCronJob(updated);
    }

    return this.withNextRun(updated);
  }

  delete(id: string): void {
    const existing = this.tasksRepo.findById(id);
    if (!existing) throw new NotFoundException("Scheduled task not found");
    this.unregisterCronJob(id);
    this.tasksRepo.delete(id);
  }

  toggle(id: string): IScheduledTask {
    const existing = this.tasksRepo.findById(id);
    if (!existing) throw new NotFoundException("Scheduled task not found");

    const updated = this.tasksRepo.update(id, { enabled: !existing.enabled })!;
    this.unregisterCronJob(id);
    if (updated.enabled) {
      this.registerCronJob(updated);
    }
    return this.withNextRun(updated);
  }

  async runNow(id: string): Promise<IScheduledTaskRun> {
    const task = this.tasksRepo.findById(id);
    if (!task) throw new NotFoundException("Scheduled task not found");
    return this.executeTask(task, ScheduledRunTrigger.MANUAL);
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

  ///
  /// Internals
  ///

  private withNextRun(task: IScheduledTask): IScheduledTask {
    return { ...task, nextRunAt: this.computeNextRun(task) };
  }

  private computeNextRun(task: IScheduledTask): number | null {
    if (!task.enabled) return null;
    if (task.mode === ScheduleMode.ONCE) {
      return task.runAt && task.runAt > Date.now() ? task.runAt : null;
    }
    if (!task.cronExpression) return null;
    try {
      const job = new CronJob(
        task.cronExpression,
        () => undefined,
        null,
        false,
        task.timezone || undefined,
      );
      return job.nextDate().toJSDate().getTime();
    } catch {
      return null;
    }
  }

  private mergeForUpdate(
    existing: IScheduledTask,
    dto: UpdateScheduledTaskDto,
  ): Partial<IScheduledTask> {
    const merged: Partial<IScheduledTask> = {};

    if (dto.name !== undefined) merged.name = dto.name.trim();
    if (dto.enabled !== undefined) merged.enabled = dto.enabled;
    if (dto.timezone !== undefined) merged.timezone = dto.timezone || null;

    if (dto.action !== undefined) {
      merged.action = dto.action.type;
      merged.actionPayload = this.canonicalizeAction(dto.action);
    }

    const mode = dto.mode ?? existing.mode;
    const reschedule =
      dto.mode !== undefined ||
      dto.simple !== undefined ||
      dto.cron !== undefined ||
      dto.once !== undefined;
    if (reschedule) {
      const fakeDto: CreateScheduledTaskDto = {
        name: existing.name,
        serverId: existing.serverId,
        enabled: existing.enabled,
        mode,
        simple:
          dto.simple ??
          (mode === ScheduleMode.SIMPLE && existing.mode === ScheduleMode.SIMPLE
            ? (existing.schedulePayload as any)
            : undefined),
        cron:
          dto.cron ??
          (mode === ScheduleMode.CRON && existing.mode === ScheduleMode.CRON
            ? { expression: existing.cronExpression! }
            : undefined),
        once:
          dto.once ??
          (mode === ScheduleMode.ONCE && existing.mode === ScheduleMode.ONCE
            ? { isoDateTime: new Date(existing.runAt!).toISOString() }
            : undefined),
        timezone: dto.timezone ?? existing.timezone ?? undefined,
        action: { type: existing.action, ...(existing.actionPayload as any) },
      };
      const can = this.canonicalizeSchedule(fakeDto);
      merged.mode = mode;
      merged.cronExpression = can.cronExpression;
      merged.runAt = can.runAt;
      merged.schedulePayload = can.schedulePayload;
    }

    return merged;
  }

  private canonicalizeSchedule(dto: CreateScheduledTaskDto): {
    cronExpression: string | null;
    runAt: number | null;
    schedulePayload: SchedulePayload;
  } {
    if (dto.mode === ScheduleMode.SIMPLE) {
      if (!dto.simple)
        throw new BadRequestException(
          "simple payload is required for SIMPLE mode",
        );
      const cron = this.simpleToCron(dto.simple);
      this.validateCron(cron);
      return {
        cronExpression: cron,
        runAt: null,
        schedulePayload: { mode: ScheduleMode.SIMPLE, ...dto.simple },
      };
    }

    if (dto.mode === ScheduleMode.CRON) {
      if (!dto.cron)
        throw new BadRequestException("cron payload is required for CRON mode");
      this.validateCron(dto.cron.expression);
      return {
        cronExpression: dto.cron.expression,
        runAt: null,
        schedulePayload: {
          mode: ScheduleMode.CRON,
          expression: dto.cron.expression,
        },
      };
    }

    if (dto.mode === ScheduleMode.ONCE) {
      if (!dto.once)
        throw new BadRequestException("once payload is required for ONCE mode");
      const ts = Date.parse(dto.once.isoDateTime);
      if (Number.isNaN(ts))
        throw new BadRequestException("isoDateTime is invalid");
      if (ts <= Date.now())
        throw new BadRequestException("isoDateTime must be in the future");
      return {
        cronExpression: null,
        runAt: ts,
        schedulePayload: {
          mode: ScheduleMode.ONCE,
          isoDateTime: dto.once.isoDateTime,
        },
      };
    }

    throw new BadRequestException("Unsupported schedule mode");
  }

  private canonicalizeAction(
    action: CreateScheduledTaskDto["action"],
  ): SchedulerActionPayload {
    switch (action.type) {
      case SchedulerActionType.SERVER_START:
      case SchedulerActionType.SERVER_STOP:
      case SchedulerActionType.SERVER_RESTART:
        return { type: action.type };
      case SchedulerActionType.SERVER_COMMAND:
        if (!action.command)
          throw new BadRequestException("command is required");
        return { type: action.type, command: action.command };
      case SchedulerActionType.BACKUP_CREATE:
        if (!action.nameTemplate)
          throw new BadRequestException("nameTemplate is required");
        return {
          type: action.type,
          nameTemplate: action.nameTemplate,
          description: action.description,
        };
      case SchedulerActionType.HTTP_WEBHOOK:
        if (!action.url || !action.method)
          throw new BadRequestException("url and method are required");
        this.validateWebhookUrl(action.url);
        return {
          type: action.type,
          url: action.url,
          method: action.method,
          headers: action.headers,
          body: action.body,
        };
      default:
        throw new BadRequestException("Unknown action type");
    }
  }

  private validateCron(expression: string): void {
    try {
      // Construct a job to validate; never start it
      new CronJob(expression, () => undefined, null, false);
    } catch (e: unknown) {
      throw new BadRequestException(
        `Invalid cron expression: ${getErrorMessage(e)}`,
      );
    }
  }

  private validateWebhookUrl(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException("Invalid webhook URL");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new BadRequestException("Webhook URL must use http or https");
    }
    if (PRIVATE_HOST_REGEX.test(parsed.hostname)) {
      throw new BadRequestException(
        "Webhook URL points to a private/internal address",
      );
    }
  }

  private simpleToCron(
    payload: NonNullable<CreateScheduledTaskDto["simple"]>,
  ): string {
    if (payload.kind === SimpleScheduleKind.INTERVAL) {
      const value = payload.intervalValue!;
      if (payload.intervalUnit === IntervalUnit.MINUTES) {
        return `*/${value} * * * *`;
      }
      // hours
      return `0 */${value} * * *`;
    }

    if (payload.kind === SimpleScheduleKind.DAILY) {
      const [hh, mm] = payload.time!.split(":");
      return `${Number(mm)} ${Number(hh)} * * *`;
    }

    if (payload.kind === SimpleScheduleKind.WEEKLY) {
      const [hh, mm] = payload.time!.split(":");
      const days = (
        payload.weekdays && payload.weekdays.length > 0 ? payload.weekdays : [1]
      ).join(",");
      return `${Number(mm)} ${Number(hh)} * * ${days}`;
    }

    throw new BadRequestException("Unsupported simple schedule kind");
  }

  ///
  /// Cron registration
  ///

  private cronJobName(taskId: string): string {
    return `scheduled-task:${taskId}`;
  }

  private registerCronJob(task: IScheduledTask): void {
    const name = this.cronJobName(task.id);

    const fire = () => {
      this.executeTask(
        task,
        task.mode === ScheduleMode.ONCE
          ? ScheduledRunTrigger.ONCE
          : ScheduledRunTrigger.CRON,
      ).catch((e) =>
        this.logger.error(`Task ${task.id} firing failed: ${e?.message ?? e}`),
      );
    };

    if (task.mode === ScheduleMode.ONCE) {
      if (!task.runAt) return;
      const date = new Date(task.runAt);
      if (date.getTime() <= Date.now()) return; // missed; will be ignored on bootstrap
      const job = new CronJob(
        date,
        () => {
          fire();
          // Disable after firing so it doesn't linger and so listEnabled excludes it
          this.tasksRepo.update(task.id, { enabled: false });
          this.unregisterCronJob(task.id);
        },
        null,
        false,
        task.timezone || undefined,
      );
      this.schedulerRegistry.addCronJob(name, job);
      job.start();
      return;
    }

    if (!task.cronExpression) return;
    const job = new CronJob(
      task.cronExpression,
      fire,
      null,
      false,
      task.timezone || undefined,
    );
    this.schedulerRegistry.addCronJob(name, job);
    job.start();
  }

  private unregisterCronJob(taskId: string): void {
    const name = this.cronJobName(taskId);
    try {
      this.schedulerRegistry.deleteCronJob(name);
    } catch {
      // ignore - not registered
    }
  }

  ///
  /// Execution
  ///

  private async executeTask(
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

    this.tasksRepo.setLastRun(
      task.id,
      status === ScheduledRunStatus.SUCCESS
        ? ScheduledRunStatus.SUCCESS
        : ScheduledRunStatus.FAILED,
      error,
    );

    this.runsRepo.pruneOlderThan(task.id, RUNS_HISTORY_LIMIT);

    return run;
  }

  private assertOwnerStillAuthorized(task: IScheduledTask): void {
    const owner = this.usersRepo.findById(task.ownerId);
    if (!owner) throw new Error("Task owner no longer exists");
    if (!owner.isAdmin) {
      const requiredPermission: UserPermissionsType =
        UserPermissions.SCHEDULER_MANAGEMENT;
      if (!owner.permissions.includes(requiredPermission)) {
        throw new Error("Task owner no longer has scheduler permission");
      }
      if (
        owner.serversRestrict?.enabled &&
        !owner.serversRestrict.allowed.includes(task.serverId)
      ) {
        throw new Error("Task owner no longer has access to the target server");
      }
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
        const name = this.formatBackupName(action.nameTemplate);
        const { backup, taskId } = await this.backupsService.createBackup(
          {
            name,
            description: action.description,
            type: BackupType.FULL,
            serverId: task.serverId,
          },
          owner.id,
        );
        return `backup task ${taskId} created (id=${backup.id})`;
      }
      case SchedulerActionType.HTTP_WEBHOOK: {
        return await this.invokeWebhook(action);
      }
      default:
        throw new Error("Unknown action type");
    }
  }

  private requireInstance(serverId: string) {
    const inst = this.instancesRegistry.getByServerId(serverId);
    if (!inst) throw new Error("Server instance is not registered");
    return inst;
  }

  private formatBackupName(template: string): string {
    const date = new Date().toISOString().replace(/[:.]/g, "-");
    return template.replace(/\{\{\s*date\s*\}\}/g, date).slice(0, 120);
  }

  private async invokeWebhook(
    payload: Extract<
      SchedulerActionPayload,
      { type: SchedulerActionType.HTTP_WEBHOOK }
    >,
  ): Promise<string> {
    this.validateWebhookUrl(payload.url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    try {
      const body =
        payload.body && payload.method !== "GET" ? payload.body : undefined;
      if (body && Buffer.byteLength(body, "utf8") > WEBHOOK_MAX_BODY_BYTES) {
        throw new Error("Webhook body exceeds size limit");
      }

      const response = await fetch(payload.url, {
        method: payload.method,
        headers: payload.headers,
        body,
        signal: controller.signal,
      });

      const responseText = await response.text();
      const truncated =
        responseText.length > 2000
          ? responseText.slice(0, 2000) + "…"
          : responseText;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${truncated.slice(0, 200)}`);
      }

      return `HTTP ${response.status} (${truncated.length} bytes)`;
    } finally {
      clearTimeout(timer);
    }
  }
}
