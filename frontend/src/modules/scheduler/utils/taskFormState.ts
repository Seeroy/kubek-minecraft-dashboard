import {
  IScheduledTask,
  IntervalUnit,
  ScheduleMode,
  SchedulerActionType,
  SimpleScheduleKind,
} from "@shared/types/scheduler.types";
import type { FormState } from "../types";

/** Convert an ISO timestamp to an <input type="datetime-local"> value (YYYY-MM-DDTHH:mm) */
export const isoToLocalInput = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Convert a datetime-local input value back to an ISO string (empty input -> empty string) */
export const localInputToIso = (local: string): string =>
  local ? new Date(local).toISOString() : "";

export const initialState = (): FormState => ({
  name: "",
  enabled: true,
  timezone: "",
  mode: ScheduleMode.SIMPLE,
  simpleKind: SimpleScheduleKind.INTERVAL,
  intervalValue: 5,
  intervalUnit: IntervalUnit.MINUTES,
  time: "03:00",
  weekdays: [1],
  cronExpression: "*/5 * * * *",
  onceDateTime: "",
  actionType: SchedulerActionType.SERVER_RESTART,
  command: "",
  backupNameTemplate: "auto-{{date}}",
  backupDescription: "",
  webhookUrl: "",
  webhookMethod: "POST",
  webhookHeaders: "",
  webhookBody: "",
});

export const stateFromTask = (task: IScheduledTask): FormState => {
  const base = initialState();
  base.name = task.name;
  base.enabled = task.enabled;
  base.timezone = task.timezone ?? "";
  base.mode = task.mode;

  const sp = task.schedulePayload;
  if (sp.mode === ScheduleMode.SIMPLE) {
    base.simpleKind = sp.kind;
    if (sp.intervalValue) base.intervalValue = sp.intervalValue;
    if (sp.intervalUnit) base.intervalUnit = sp.intervalUnit;
    if (sp.time) base.time = sp.time;
    if (sp.weekdays && sp.weekdays.length > 0) base.weekdays = sp.weekdays;
  } else if (sp.mode === ScheduleMode.CRON) {
    base.cronExpression = sp.expression;
  } else if (sp.mode === ScheduleMode.ONCE) {
    base.onceDateTime = isoToLocalInput(sp.isoDateTime);
  }

  const ap = task.actionPayload;
  base.actionType = ap.type;
  if (ap.type === SchedulerActionType.SERVER_COMMAND) base.command = ap.command;
  if (ap.type === SchedulerActionType.BACKUP_CREATE) {
    base.backupNameTemplate = ap.nameTemplate;
    base.backupDescription = ap.description ?? "";
  }
  if (ap.type === SchedulerActionType.HTTP_WEBHOOK) {
    base.webhookUrl = ap.url;
    base.webhookMethod = ap.method;
    base.webhookHeaders = ap.headers ? JSON.stringify(ap.headers, null, 2) : "";
    base.webhookBody = ap.body ?? "";
  }

  return base;
};
