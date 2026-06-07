// Scheduler actions
export enum SchedulerActionType {
  SERVER_START = "server_start",
  SERVER_STOP = "server_stop",
  SERVER_RESTART = "server_restart",
  SERVER_COMMAND = "server_command",
  BACKUP_CREATE = "backup_create",
  HTTP_WEBHOOK = "http_webhook",
}

// How the schedule is described in the form
export enum ScheduleMode {
  SIMPLE = "simple",
  CRON = "cron",
  ONCE = "once",
}

export enum SimpleScheduleKind {
  INTERVAL = "interval",
  DAILY = "daily",
  WEEKLY = "weekly",
}

export enum IntervalUnit {
  MINUTES = "minutes",
  HOURS = "hours",
}

export enum ScheduledRunStatus {
  RUNNING = "running",
  SUCCESS = "success",
  FAILED = "failed",
}

export enum ScheduledRunTrigger {
  CRON = "cron",
  MANUAL = "manual",
  ONCE = "once",
}

// Discriminated union for action payloads
export interface CommandActionPayload {
  command: string;
}

export interface BackupActionPayload {
  nameTemplate: string;
  description?: string;
}

export interface WebhookActionPayload {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
}

export type SchedulerActionPayload =
  | { type: SchedulerActionType.SERVER_START }
  | { type: SchedulerActionType.SERVER_STOP }
  | { type: SchedulerActionType.SERVER_RESTART }
  | ({ type: SchedulerActionType.SERVER_COMMAND } & CommandActionPayload)
  | ({ type: SchedulerActionType.BACKUP_CREATE } & BackupActionPayload)
  | ({ type: SchedulerActionType.HTTP_WEBHOOK } & WebhookActionPayload);

export interface SimpleSchedulePayload {
  kind: SimpleScheduleKind;
  // INTERVAL
  intervalValue?: number;
  intervalUnit?: IntervalUnit;
  // DAILY/WEEKLY
  time?: string; // HH:mm
  weekdays?: number[]; // 0..6, Sunday=0
}

export interface OnceSchedulePayload {
  // ISO string of the local-time chosen in the form
  isoDateTime: string;
}

export interface CronSchedulePayload {
  expression: string;
}

export type SchedulePayload =
  | ({ mode: ScheduleMode.SIMPLE } & SimpleSchedulePayload)
  | ({ mode: ScheduleMode.CRON } & CronSchedulePayload)
  | ({ mode: ScheduleMode.ONCE } & OnceSchedulePayload);

export interface IScheduledTask {
  id: string;
  serverId: string;
  name: string;
  enabled: boolean;
  mode: ScheduleMode;
  cronExpression: string | null;
  runAt: number | null;
  timezone: string | null;
  schedulePayload: SchedulePayload;
  action: SchedulerActionType;
  actionPayload: SchedulerActionPayload;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  lastRunAt: number | null;
  lastRunStatus: ScheduledRunStatus.SUCCESS | ScheduledRunStatus.FAILED | null;
  lastRunError: string | null;
  // Computed by the backend for UI
  nextRunAt?: number | null;
}

export interface IScheduledTaskRun {
  id: string;
  taskId: string;
  serverId: string;
  startedAt: number;
  finishedAt: number | null;
  durationMs: number | null;
  status: ScheduledRunStatus;
  triggeredBy: ScheduledRunTrigger;
  output: string | null;
  error: string | null;
}
