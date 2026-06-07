import {
  IntervalUnit,
  IScheduledTask,
  ScheduleMode,
  SchedulerActionType,
  SimpleScheduleKind,
} from "@shared/types/scheduler.types";

export interface TaskFormProps {
  serverId: string;
  editingTask?: IScheduledTask | null;
}

export interface FormState {
  name: string;
  enabled: boolean;
  timezone: string;
  mode: ScheduleMode;
  // simple
  simpleKind: SimpleScheduleKind;
  intervalValue: number;
  intervalUnit: IntervalUnit;
  time: string;
  weekdays: number[];
  // cron
  cronExpression: string;
  // once
  onceDateTime: string; // local datetime-input value (YYYY-MM-DDTHH:mm)
  // action
  actionType: SchedulerActionType;
  command: string;
  backupNameTemplate: string;
  backupDescription: string;
  webhookUrl: string;
  webhookMethod: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  webhookHeaders: string;
  webhookBody: string;
}

export const WEEKDAY_KEYS = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const;
