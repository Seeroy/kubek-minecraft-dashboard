import { useTranslation } from "@/shared/hooks/useTranslation";
import type { BlueprintVariable } from "@/shared/types/server-types.types";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Switch } from "@/shared/ui/switch";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";

// Short static lists read better as a segmented control
const SEGMENTED_MAX = 3;

interface VariableControlProps {
  variable: BlueprintVariable;
  id: string;
  label: string;
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean) => void;
  versions?: string[];
  versionsLoading?: boolean;
  invalid?: boolean;
  /** Render short static lists as a segmented control */
  segmented?: boolean;
}

export function VariableControl({ variable, id, label, value, onChange, versions = [], versionsLoading, invalid, segmented }: VariableControlProps) {
  const { t } = useTranslation("modules.newServerModal.blueprint");
  const options = variable.options?.from === "versions" ? versions : variable.options?.from === "static" ? variable.options.values.map(String) : null;

  if (options) {
    if (versionsLoading) return <Skeleton className="h-ctl" />;
    if (segmented && variable.options?.from === "static" && options.length <= SEGMENTED_MAX) {
      return (
        <ToggleGroup variant="segmented" value={[String(value ?? "")]} onValueChange={(next) => next[0] && onChange(next[0])} aria-label={label}>
          {options.map((option) => (
            <Toggle key={option} variant="segmented" value={option}>
              {option}
            </Toggle>
          ))}
        </ToggleGroup>
      );
    }
    return (
      <Select value={String(value ?? "")} onValueChange={(next) => next != null && onChange(next)}>
        <SelectTrigger id={id} className="w-full" aria-invalid={invalid || undefined}>
          <SelectValue placeholder={variable.options?.from === "versions" ? t("selectVersion") : t("selectOption", label)} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (variable.type === "boolean") return <Switch id={id} checked={!!value} onCheckedChange={onChange} />;

  return (
    <Input
      id={id}
      type={variable.type === "number" ? "number" : variable.type === "secret" ? "password" : "text"}
      aria-invalid={invalid || undefined}
      value={value === undefined ? "" : String(value)}
      onChange={(event) => {
        const raw = event.target.value;
        onChange(variable.type === "number" && raw !== "" ? Number(raw) : raw);
      }}
    />
  );
}
