import { VersionText } from "@/modules/server-types/ui/VersionText";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { privateKeyLevel } from "@/shared/lib/streamer-mode";
import type { BlueprintVariable } from "@/shared/types/server-types.types";
import { DataReveal } from "@/shared/ui/data-reveal";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { SAMPLE_VERSIONS } from "../data/samples";

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
  /** Display labels of versions by id */
  versionLabels?: ReadonlyMap<string, string>;
  invalid?: boolean;
  /** Render short static lists as a segmented control */
  segmented?: boolean;
}

export function VariableControl({ variable, id, label, value, onChange, versions = [], versionsLoading, versionLabels, invalid, segmented }: VariableControlProps) {
  const { t } = useTranslation("modules.newServerModal.blueprint");
  const isVersions = variable.options?.from === "versions";
  const options = isVersions ? versions : variable.options?.from === "static" ? variable.options.values.map(String) : null;

  if (options) {
    const control = (list: string[]) =>
      segmented && variable.options?.from === "static" && list.length <= SEGMENTED_MAX ? (
        <ToggleGroup variant="segmented" value={[String(value ?? "")]} onValueChange={(next) => next[0] && onChange(next[0])} aria-label={label}>
          {list.map((option) => (
            <Toggle key={option} variant="segmented" value={option}>
              {option}
            </Toggle>
          ))}
        </ToggleGroup>
      ) : (
        <Select value={String(value ?? "")} onValueChange={(next) => next != null && onChange(next)}>
          <SelectTrigger id={id} className="w-full" aria-invalid={invalid || undefined}>
            <SelectValue placeholder={isVersions ? t("selectVersion") : t("selectOption", label)}>
              {isVersions && versionLabels?.size
                ? (selected: string) => (selected ? <VersionText id={selected} label={versionLabels.get(selected)} /> : t("selectVersion"))
                : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {list.map((option) => (
              <SelectItem key={option} value={option}>
                {isVersions ? <VersionText id={option} label={versionLabels?.get(option)} /> : option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    if (!isVersions) return control(options);
    return (
      <DataReveal id={`variable-${id}`} data={options} loading={versionsLoading} sample={SAMPLE_VERSIONS}>
        {control}
      </DataReveal>
    );
  }

  if (variable.type === "boolean") return <Switch id={id} checked={!!value} onCheckedChange={onChange} />;

  return (
    <Input
      id={id}
      type={variable.type === "number" ? "number" : variable.type === "secret" ? "password" : "text"}
      aria-invalid={invalid || undefined}
      data-private={privateKeyLevel(variable.key) ?? undefined}
      value={value === undefined ? "" : String(value)}
      onChange={(event) => {
        const raw = event.target.value;
        onChange(variable.type === "number" && raw !== "" ? Number(raw) : raw);
      }}
    />
  );
}
