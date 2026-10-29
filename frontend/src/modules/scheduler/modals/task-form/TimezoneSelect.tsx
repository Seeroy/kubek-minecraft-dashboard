"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Field } from "@/shared/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

// Empty means the backend default, so it stays the first choice
const DEFAULT = "";
let zones: string[] | undefined;
const timeZones = () => (zones ??= Intl.supportedValuesOf("timeZone"));

export function TimezoneSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation("modules.scheduler.form");

  return (
    <Field className="max-w-72">
      <span className="font-medium">{t("timezone")}</span>
      <Select<string> value={value} onValueChange={(next) => next != null && onChange(next)}>
        <SelectTrigger className="w-full" aria-label={t("timezone")}>
          <SelectValue>{(current: string) => current || t("timezoneDefault")}</SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value={DEFAULT}>{t("timezoneDefault")}</SelectItem>
          {timeZones().map((zone) => (
            <SelectItem key={zone} value={zone}>
              {zone}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
