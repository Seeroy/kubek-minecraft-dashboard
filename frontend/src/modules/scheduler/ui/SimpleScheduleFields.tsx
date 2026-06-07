import type { Translator } from "@/locales/types";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  IntervalUnit,
  SimpleScheduleKind,
} from "@shared/types/scheduler.types";
import { FormState, WEEKDAY_KEYS } from "../types";

interface SimpleScheduleFieldsProps {
  state: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  toggleWeekday: (day: number) => void;
  t: Translator;
}

export const SimpleScheduleFields = ({
  state,
  set,
  toggleWeekday,
  t,
}: SimpleScheduleFieldsProps) => {
  const simpleKindItems = [
    {
      value: SimpleScheduleKind.INTERVAL,
      label: t("form.simple.kinds.interval"),
    },
    { value: SimpleScheduleKind.DAILY, label: t("form.simple.kinds.daily") },
    { value: SimpleScheduleKind.WEEKLY, label: t("form.simple.kinds.weekly") },
  ];

  const intervalUnitItems = [
    {
      value: IntervalUnit.MINUTES,
      label: t("form.simple.intervalUnits.minutes"),
    },
    { value: IntervalUnit.HOURS, label: t("form.simple.intervalUnits.hours") },
  ];

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>{t("form.simple.kindLabel")}</Label>
        <Select
          items={simpleKindItems}
          value={state.simpleKind}
          onValueChange={(v) => set("simpleKind", v as SimpleScheduleKind)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {simpleKindItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {state.simpleKind === SimpleScheduleKind.INTERVAL && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("form.simple.intervalValueLabel")}</Label>
            <Input
              type="number"
              min={1}
              value={state.intervalValue}
              onChange={(e) =>
                set("intervalValue", Math.max(1, Number(e.target.value)))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>&nbsp;</Label>
            <Select
              items={intervalUnitItems}
              value={state.intervalUnit}
              onValueChange={(v) => set("intervalUnit", v as IntervalUnit)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {intervalUnitItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {(state.simpleKind === SimpleScheduleKind.DAILY ||
        state.simpleKind === SimpleScheduleKind.WEEKLY) && (
        <div className="space-y-1.5">
          <Label>{t("form.simple.timeLabel")}</Label>
          <Input
            type="time"
            value={state.time}
            onChange={(e) => set("time", e.target.value)}
          />
        </div>
      )}

      {state.simpleKind === SimpleScheduleKind.WEEKLY && (
        <div className="space-y-1.5">
          <Label>{t("form.simple.weekdaysLabel")}</Label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_KEYS.map((key, idx) => (
              <Button
                key={key}
                type="button"
                variant={state.weekdays.includes(idx) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleWeekday(idx)}
              >
                {t(`form.simple.weekdays.${key}`)}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
