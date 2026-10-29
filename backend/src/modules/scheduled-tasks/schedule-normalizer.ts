import { getErrorMessage } from "@/core/utils/error";
import { simpleToCron } from "@/core/utils/schedule";
import { BadRequestException } from "@nestjs/common";
import {
  type IScheduledTask,
  ScheduleMode,
  type SchedulePayload,
  type SchedulerActionPayload,
  SchedulerActionType,
  type SimpleSchedulePayload,
} from "@shared/types/scheduler.types";
import { CronJob } from "cron";
import type {
  CreateScheduledTaskDto,
  UpdateScheduledTaskDto,
} from "./dto/scheduled-task.dto";
import { assertWebhookUrlShape } from "./webhook-client";

export interface NormalizedSchedule {
  cronExpression: string | null;
  runAt: number | null;
  schedulePayload: SchedulePayload;
}

type ScheduleInput = Pick<
  CreateScheduledTaskDto,
  "mode" | "simple" | "cron" | "once"
>;

/** 400 if cron can't parse it */
export function validateCron(expression: string): void {
  try {
    // Construct a job to validate; never start it
    new CronJob(expression, () => undefined, null, false);
  } catch (e: unknown) {
    throw new BadRequestException(
      `Invalid cron expression: ${getErrorMessage(e)}`,
    );
  }
}

/** Form schedule to the stored one, cron or a timestamp plus the original */
export function normalizeSchedule(
  dto: ScheduleInput,
  now: number = Date.now(),
): NormalizedSchedule {
  if (dto.mode === ScheduleMode.SIMPLE) {
    if (!dto.simple)
      throw new BadRequestException(
        "simple payload is required for SIMPLE mode",
      );
    const cron = simpleToCron(dto.simple);
    if (!cron)
      throw new BadRequestException("Unsupported simple schedule kind");
    validateCron(cron);
    return {
      cronExpression: cron,
      runAt: null,
      schedulePayload: { mode: ScheduleMode.SIMPLE, ...dto.simple },
    };
  }

  if (dto.mode === ScheduleMode.CRON) {
    if (!dto.cron)
      throw new BadRequestException("cron payload is required for CRON mode");
    validateCron(dto.cron.expression);
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
    if (ts <= now)
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

/** Keep only the fields this action uses and check required ones */
export function normalizeAction(
  action: CreateScheduledTaskDto["action"],
): SchedulerActionPayload {
  switch (action.type) {
    case SchedulerActionType.SERVER_START:
    case SchedulerActionType.SERVER_STOP:
    case SchedulerActionType.SERVER_RESTART:
      return { type: action.type };
    case SchedulerActionType.SERVER_COMMAND:
      if (!action.command) throw new BadRequestException("command is required");
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
      assertWebhookUrlShape(action.url);
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

/**
 * Fields for a partial update. Missing schedule fields come from the
 * stored task while the mode stays the same
 */
export function mergeForUpdate(
  existing: IScheduledTask,
  dto: UpdateScheduledTaskDto,
  now: number = Date.now(),
): Partial<IScheduledTask> {
  const merged: Partial<IScheduledTask> = {};

  if (dto.name !== undefined) merged.name = dto.name.trim();
  if (dto.enabled !== undefined) merged.enabled = dto.enabled;
  if (dto.timezone !== undefined) merged.timezone = dto.timezone || null;

  if (dto.action !== undefined) {
    merged.action = dto.action.type;
    merged.actionPayload = normalizeAction(dto.action);
  }

  const mode = dto.mode ?? existing.mode;
  const reschedule =
    dto.mode !== undefined ||
    dto.simple !== undefined ||
    dto.cron !== undefined ||
    dto.once !== undefined;
  if (reschedule) {
    const sameMode = (m: ScheduleMode) => mode === m && existing.mode === m;
    const schedule = normalizeSchedule(
      {
        mode,
        simple:
          dto.simple ??
          (sameMode(ScheduleMode.SIMPLE)
            ? (existing.schedulePayload as SimpleSchedulePayload)
            : undefined),
        cron:
          dto.cron ??
          (sameMode(ScheduleMode.CRON)
            ? { expression: existing.cronExpression! }
            : undefined),
        once:
          dto.once ??
          (sameMode(ScheduleMode.ONCE)
            ? { isoDateTime: new Date(existing.runAt!).toISOString() }
            : undefined),
      },
      now,
    );
    merged.mode = mode;
    merged.cronExpression = schedule.cronExpression;
    merged.runAt = schedule.runAt;
    merged.schedulePayload = schedule.schedulePayload;
  }

  return merged;
}

/** Next run for the UI, null if off, past or broken */
export function computeNextRun(
  task: IScheduledTask,
  now: number = Date.now(),
): number | null {
  if (!task.enabled) return null;
  if (task.mode === ScheduleMode.ONCE) {
    return task.runAt && task.runAt > now ? task.runAt : null;
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
