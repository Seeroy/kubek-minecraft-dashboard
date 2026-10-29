import type { Translator } from "@/locales/types";
import { IntervalUnit, ScheduleMode, SimpleScheduleKind, type SchedulePayload } from "@shared/types/scheduler.types";
import { shortDateTime } from "./look";

// Sunday first, the order Date#getDay and cron use
export const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
// Monday first, how the week reads in the form
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const pad = (value: string | number) => String(value).padStart(2, "0");
const dayList = (days: number[], t: Translator) =>
  [...days].sort((a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b)).map((d) => t(`weekdays.${WEEKDAYS[d % 7]}`)).join(", ");

/** Common cron shapes in words, anything else stays a plain cron expression */
export function describeCron(expression: string, t: Translator): string {
  const e = expression.trim();
  let m: RegExpMatchArray | null;
  if ((m = e.match(/^\*\/(\d+) \* \* \* \*$/))) return t("describe.everyMinutes", Number(m[1]));
  if ((m = e.match(/^0 \*\/(\d+) \* \* \*$/))) return t("describe.everyHours", Number(m[1]));
  if (e === "0 * * * *") return t("describe.hourly");
  if ((m = e.match(/^(\d+) (\d+) \* \* \*$/))) return t("describe.daily", `${pad(m[2])}:${pad(m[1])}`);
  if ((m = e.match(/^(\d+) (\d+) \* \* ([\d,]+)$/))) return t("describe.weekly", dayList(m[3].split(",").map(Number), t), `${pad(m[2])}:${pad(m[1])}`);
  return t("describe.cron");
}

export function describeSchedule(schedule: SchedulePayload, t: Translator): string {
  if (schedule.mode === ScheduleMode.ONCE) return t("describe.once", shortDateTime(new Date(schedule.isoDateTime).getTime()));
  if (schedule.mode === ScheduleMode.CRON) return describeCron(schedule.expression, t);
  if (schedule.kind === SimpleScheduleKind.INTERVAL) {
    return t(schedule.intervalUnit === IntervalUnit.HOURS ? "describe.everyHours" : "describe.everyMinutes", schedule.intervalValue ?? 1);
  }
  if (schedule.kind === SimpleScheduleKind.DAILY) return t("describe.daily", schedule.time ?? "");
  return t("describe.weekly", dayList(schedule.weekdays ?? [], t), schedule.time ?? "");
}

export function formatRunDuration(ms: number | null, t: Translator): string {
  if (ms == null) return "…";
  if (ms < 60_000) return t("duration.seconds", (ms / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
  return t("duration.minutes", Math.floor(ms / 60_000), Math.round((ms % 60_000) / 1000));
}
