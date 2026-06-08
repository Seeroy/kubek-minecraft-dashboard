import type { CreateScheduledTaskRequest } from "@/api";
import {
  ScheduleMode,
  SchedulerActionType,
  SimpleScheduleKind,
} from "@shared/types/scheduler.types";
import type { FormState } from "../types";
import { localInputToIso } from "./taskFormState";

export const buildPayload = (
  state: FormState,
  serverId: string
): CreateScheduledTaskRequest => {
  const base = {
    name: state.name.trim(),
    serverId,
    enabled: state.enabled,
    mode: state.mode,
    timezone: state.timezone || undefined,
  };

  let modePart: any = {};
  if (state.mode === ScheduleMode.SIMPLE) {
    const simple: any = { kind: state.simpleKind };
    if (state.simpleKind === SimpleScheduleKind.INTERVAL) {
      simple.intervalValue = state.intervalValue;
      simple.intervalUnit = state.intervalUnit;
    } else if (state.simpleKind === SimpleScheduleKind.DAILY) {
      simple.time = state.time;
    } else {
      simple.time = state.time;
      simple.weekdays = state.weekdays;
    }
    modePart = { simple };
  } else if (state.mode === ScheduleMode.CRON) {
    modePart = { cron: { expression: state.cronExpression } };
  } else {
    modePart = { once: { isoDateTime: localInputToIso(state.onceDateTime) } };
  }

  let action: any = { type: state.actionType };
  if (state.actionType === SchedulerActionType.SERVER_COMMAND) {
    action.command = state.command;
  } else if (state.actionType === SchedulerActionType.BACKUP_CREATE) {
    action.nameTemplate = state.backupNameTemplate;
    if (state.backupDescription) action.description = state.backupDescription;
  } else if (state.actionType === SchedulerActionType.HTTP_WEBHOOK) {
    action.url = state.webhookUrl;
    action.method = state.webhookMethod;
    if (state.webhookHeaders.trim()) {
      try {
        action.headers = JSON.parse(state.webhookHeaders);
      } catch {
        throw new Error("Invalid headers JSON");
      }
    }
    if (state.webhookBody) action.body = state.webhookBody;
  }

  // The schedule mode/kind enums are string-valued and line up with the
  // contract's string literals
  return { ...base, ...modePart, action } as CreateScheduledTaskRequest;
};
