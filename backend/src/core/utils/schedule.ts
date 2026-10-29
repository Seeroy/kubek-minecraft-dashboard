import {
  IntervalUnit,
  ScheduleMode,
  SimpleScheduleKind,
  type SchedulePayload,
  type SimpleSchedulePayload,
} from "@shared/types/scheduler.types";

// Turns the simple form (every N min, daily, weekly) into cron
export function simpleToCron(payload: SimpleSchedulePayload): string | null {
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

  return null;
}

// Cron the task runs on, null for one-time tasks
export function scheduleCron(payload: SchedulePayload): string | null {
  if (payload.mode === ScheduleMode.CRON) return payload.expression;
  if (payload.mode === ScheduleMode.SIMPLE) return simpleToCron(payload);
  return null;
}

// When a one-time task fires, null for the rest
export function scheduleRunAt(payload: SchedulePayload): number | null {
  if (payload.mode !== ScheduleMode.ONCE) return null;
  const ts = Date.parse(payload.isoDateTime);
  return Number.isNaN(ts) ? null : ts;
}
