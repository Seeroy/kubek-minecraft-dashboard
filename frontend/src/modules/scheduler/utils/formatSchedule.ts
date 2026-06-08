import type { Translator } from "@/locales/types";
import {
  IScheduledTask,
  IntervalUnit,
  ScheduleMode,
  SimpleScheduleKind,
} from "@shared/types/scheduler.types";

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function formatSchedule(task: IScheduledTask, t: Translator): string {
  const sp = task.schedulePayload;

  if (sp.mode === ScheduleMode.SIMPLE) {
    if (sp.kind === SimpleScheduleKind.INTERVAL) {
      const unit =
        sp.intervalUnit === IntervalUnit.HOURS
          ? t("form.simple.intervalUnits.hours")
          : t("form.simple.intervalUnits.minutes");
      return `${t("form.simple.intervalValueLabel")} ${sp.intervalValue} ${unit}`;
    }
    if (sp.kind === SimpleScheduleKind.DAILY) {
      return `${t("form.simple.kinds.daily")} ${sp.time ?? ""}`;
    }
    if (sp.kind === SimpleScheduleKind.WEEKLY) {
      const days = (sp.weekdays ?? [])
        .map((d) => t(`form.simple.weekdays.${WEEKDAY_KEYS[d]}`))
        .join(", ");
      return `${days} ${sp.time ?? ""}`;
    }
  }

  if (sp.mode === ScheduleMode.CRON) {
    return sp.expression;
  }

  if (sp.mode === ScheduleMode.ONCE) {
    return new Date(sp.isoDateTime).toLocaleString();
  }

  return "-";
}

export function formatDateTime(timestamp: number | null | undefined): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleString();
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "-";
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  return `${minutes}m ${remSec}s`;
}
