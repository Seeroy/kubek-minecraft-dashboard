"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { IntervalUnit, ScheduleMode, SimpleScheduleKind } from "@shared/types/scheduler.types";
import type { TaskFormState } from "../../lib/form";
import { WEEKDAYS, WEEK_ORDER } from "../../lib/schedule";
import type { SetField } from "../TaskFormDialog";

const CRON_PRESETS = [
  ["every5", "*/5 * * * *"],
  ["hourly", "0 * * * *"],
  ["daily", "0 4 * * *"],
  ["every6h", "0 */6 * * *"],
  ["monday", "30 3 * * 1"],
  ["weekend", "0 12 * * 6,0"],
] as const;

const KINDS = [SimpleScheduleKind.INTERVAL, SimpleScheduleKind.DAILY, SimpleScheduleKind.WEEKLY];

export function ScheduleFields({ state, set }: { state: TaskFormState; set: SetField }) {
  const { t } = useTranslation("modules.scheduler.form");
  const { t: tRoot } = useTranslation("modules.scheduler");

  if (state.mode === ScheduleMode.CRON) {
    return (
      <>
        <Field>
          <FieldLabel htmlFor="task-cron">{t("cron")}</FieldLabel>
          <Input
            id="task-cron"
            className="font-mono"
            placeholder="*/5 * * * *"
            value={state.cronExpression}
            onChange={(e) => set("cronExpression", e.target.value)}
          />
          <FieldDescription>{t("cronHint")}</FieldDescription>
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {CRON_PRESETS.map(([key, expression]) => (
            <Button key={key} type="button" variant="outline" size="xs" onClick={() => set("cronExpression", expression)}>
              {t(`presets.${key}`)}
            </Button>
          ))}
        </div>
      </>
    );
  }

  if (state.mode === ScheduleMode.ONCE) {
    return (
      <Field>
        <FieldLabel htmlFor="task-once">{t("onceAt")}</FieldLabel>
        <Input
          id="task-once"
          type="datetime-local"
          className="w-60"
          value={state.onceDateTime}
          onChange={(e) => set("onceDateTime", e.target.value)}
        />
      </Field>
    );
  }

  return (
    <>
      <Field>
        <span className="font-medium">{t("when")}</span>
        <ToggleGroup
          variant="segmented"
          className="max-w-full max-sm:w-full max-sm:flex-col max-sm:items-stretch max-sm:data-[variant=segmented]:h-auto max-sm:*:h-7"
          value={[state.simpleKind]}
          onValueChange={(next) => next[0] && set("simpleKind", next[0] as SimpleScheduleKind)}
        >
          {KINDS.map((kind) => (
            <Toggle key={kind} variant="segmented" value={kind}>
              {t(`kinds.${kind}`)}
            </Toggle>
          ))}
        </ToggleGroup>
      </Field>

      {state.simpleKind === SimpleScheduleKind.INTERVAL ? (
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="task-interval">{t("every")}</FieldLabel>
            <Input
              id="task-interval"
              type="number"
              min={1}
              max={state.intervalUnit === IntervalUnit.MINUTES ? 59 : 23}
              value={state.intervalValue}
              onChange={(e) => set("intervalValue", Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
          <Field>
            <FieldLabel>&nbsp;</FieldLabel>
            <Select<IntervalUnit> value={state.intervalUnit} onValueChange={(value) => value && set("intervalUnit", value)}>
              <SelectTrigger className="w-full" aria-label={t("every")}>
                <SelectValue>{(value: IntervalUnit) => t(`units.${value}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={IntervalUnit.MINUTES}>{t("units.minutes")}</SelectItem>
                <SelectItem value={IntervalUnit.HOURS}>{t("units.hours")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      ) : (
        <Field>
          <FieldLabel htmlFor="task-time">{t("time")}</FieldLabel>
          <Input id="task-time" type="time" className="w-36" value={state.time} onChange={(e) => set("time", e.target.value)} />
        </Field>
      )}

      {state.simpleKind === SimpleScheduleKind.WEEKLY && (
        <Field>
          <span className="font-medium">{t("days")}</span>
          <ToggleGroup
            multiple
            className="flex-wrap gap-1"
            value={state.weekdays.map(String)}
            onValueChange={(next) => set("weekdays", next.map(Number))}
          >
            {WEEK_ORDER.map((day) => (
              <Toggle
                key={day}
                value={String(day)}
                variant="outline"
                size="sm"
                className="w-10 data-pressed:border-primary/45 data-pressed:bg-primary/14 data-pressed:text-primary"
              >
                {tRoot(`weekdays.${WEEKDAYS[day]}`)}
              </Toggle>
            ))}
          </ToggleGroup>
        </Field>
      )}
    </>
  );
}
