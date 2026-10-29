import type { CreateScheduledTaskRequest } from "@/api";
import {
  IntervalUnit,
  ScheduleMode,
  SchedulerActionType,
  SimpleScheduleKind,
  type IScheduledTask,
  type WebhookActionPayload,
} from "@shared/types/scheduler.types";

export type HttpMethod = WebhookActionPayload["method"];
export const HTTP_METHODS: HttpMethod[] = ["POST", "GET", "PUT", "PATCH", "DELETE"];

export interface TaskFormState {
  name: string;
  enabled: boolean;
  timezone: string;
  mode: ScheduleMode;
  simpleKind: SimpleScheduleKind;
  intervalValue: number;
  intervalUnit: IntervalUnit;
  time: string;
  // 0..6, Sunday first like Date#getDay
  weekdays: number[];
  cronExpression: string;
  // <input type="datetime-local"> value
  onceDateTime: string;
  actionType: SchedulerActionType;
  command: string;
  backupNameTemplate: string;
  backupDescription: string;
  webhookUrl: string;
  webhookMethod: HttpMethod;
  webhookHeaders: string;
  webhookBody: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

export const toLocalInput = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** IANA zone of this browser, so a typed time means the user's own clock */
export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export const initialFormState = (): TaskFormState => ({
  name: "",
  enabled: true,
  timezone: browserTimeZone(),
  mode: ScheduleMode.SIMPLE,
  simpleKind: SimpleScheduleKind.DAILY,
  intervalValue: 30,
  intervalUnit: IntervalUnit.MINUTES,
  time: "04:00",
  weekdays: [1, 3, 5],
  cronExpression: "0 4 * * *",
  // Tomorrow at this time is a sane first guess for a one-off run
  onceDateTime: toLocalInput(new Date(Date.now() + 86_400_000)),
  actionType: SchedulerActionType.SERVER_RESTART,
  command: "",
  backupNameTemplate: "auto-{{date}}",
  backupDescription: "",
  webhookUrl: "",
  webhookMethod: "POST",
  webhookHeaders: '{"Content-Type": "application/json"}',
  webhookBody: "",
});

export function formStateFromTask(task: IScheduledTask): TaskFormState {
  const state = { ...initialFormState(), name: task.name, enabled: task.enabled, timezone: task.timezone ?? "", mode: task.mode };

  const schedule = task.schedulePayload;
  if (schedule.mode === ScheduleMode.SIMPLE) {
    state.simpleKind = schedule.kind;
    state.intervalValue = schedule.intervalValue ?? state.intervalValue;
    state.intervalUnit = schedule.intervalUnit ?? state.intervalUnit;
    state.time = schedule.time ?? state.time;
    if (schedule.weekdays?.length) state.weekdays = schedule.weekdays;
  } else if (schedule.mode === ScheduleMode.CRON) {
    state.cronExpression = schedule.expression;
  } else {
    state.onceDateTime = toLocalInput(new Date(schedule.isoDateTime));
  }

  const action = task.actionPayload;
  state.actionType = action.type;
  if (action.type === SchedulerActionType.SERVER_COMMAND) state.command = action.command;
  if (action.type === SchedulerActionType.BACKUP_CREATE) {
    state.backupNameTemplate = action.nameTemplate;
    state.backupDescription = action.description ?? "";
  }
  if (action.type === SchedulerActionType.HTTP_WEBHOOK) {
    state.webhookUrl = action.url;
    state.webhookMethod = action.method;
    state.webhookHeaders = action.headers ? JSON.stringify(action.headers, null, 2) : "";
    state.webhookBody = action.body ?? "";
  }
  return state;
}

/** Same translation the backend applies, so the preview matches what gets registered */
export function simpleToCron(state: TaskFormState): string {
  if (state.simpleKind === SimpleScheduleKind.INTERVAL) {
    return state.intervalUnit === IntervalUnit.MINUTES ? `*/${state.intervalValue} * * * *` : `0 */${state.intervalValue} * * *`;
  }
  const [hh, mm] = state.time.split(":").map(Number);
  if (state.simpleKind === SimpleScheduleKind.DAILY) return `${mm} ${hh} * * *`;
  return `${mm} ${hh} * * ${(state.weekdays.length ? state.weekdays : [1]).join(",")}`;
}

/** Why the schedule cannot be saved as is, the preview shows the same reason */
export function scheduleProblem(state: TaskFormState, now: number): "onceInPast" | "weekdaysRequired" | null {
  if (state.mode === ScheduleMode.ONCE) {
    const at = state.onceDateTime ? new Date(state.onceDateTime).getTime() : NaN;
    return at > now ? null : "onceInPast";
  }
  if (state.mode === ScheduleMode.SIMPLE && state.simpleKind === SimpleScheduleKind.WEEKLY && !state.weekdays.length) return "weekdaysRequired";
  return null;
}

export type TaskPayload = Omit<CreateScheduledTaskRequest, "serverId">;

/** Throws SyntaxError on broken webhook headers JSON */
export function buildTaskPayload(state: TaskFormState): TaskPayload {
  const schedule =
    state.mode === ScheduleMode.SIMPLE
      ? {
          simple: {
            kind: state.simpleKind,
            ...(state.simpleKind === SimpleScheduleKind.INTERVAL
              ? { intervalValue: state.intervalValue, intervalUnit: state.intervalUnit }
              : { time: state.time }),
            ...(state.simpleKind === SimpleScheduleKind.WEEKLY ? { weekdays: state.weekdays } : {}),
          },
        }
      : state.mode === ScheduleMode.CRON
        ? { cron: { expression: state.cronExpression.trim() } }
        : { once: { isoDateTime: new Date(state.onceDateTime).toISOString() } };

  const action =
    state.actionType === SchedulerActionType.SERVER_COMMAND
      ? { type: state.actionType, command: state.command.trim() }
      : state.actionType === SchedulerActionType.BACKUP_CREATE
        ? { type: state.actionType, nameTemplate: state.backupNameTemplate.trim(), description: state.backupDescription.trim() || undefined }
        : state.actionType === SchedulerActionType.HTTP_WEBHOOK
          ? {
              type: state.actionType,
              url: state.webhookUrl.trim(),
              method: state.webhookMethod,
              headers: state.webhookHeaders.trim() ? (JSON.parse(state.webhookHeaders) as Record<string, string>) : undefined,
              body: state.webhookBody || undefined,
            }
          : { type: state.actionType };

  // The schedule enums are string valued and match the contract literals
  return {
    name: state.name.trim(),
    enabled: state.enabled,
    mode: state.mode,
    timezone: state.timezone || undefined,
    ...schedule,
    action,
  } as TaskPayload;
}
