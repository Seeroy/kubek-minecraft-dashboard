import { useLanguageContext } from "@/shared/context/language-context";
import type { BlueprintVariable } from "@/shared/types/server-types.types";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import { Loader2 } from "lucide-react";

interface BlueprintVariableFieldProps {
  variable: BlueprintVariable;
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean) => void;
  /** Translated label; falls back to the blueprint-provided one */
  label?: string;
  versions?: string[];
  versionsLoading?: boolean;
  error?: string;
}

export function BlueprintVariableField({
  variable,
  value,
  onChange,
  label: labelProp,
  versions = [],
  versionsLoading,
  error,
}: BlueprintVariableFieldProps) {
  const { t } = useLanguageContext();
  const label = labelProp ?? variable.label ?? variable.key;
  const fromVersions = variable.options?.from === "versions";
  const fromStatic = variable.options?.from === "static";

  const renderControl = () => {
    if (fromVersions) {
      if (versionsLoading) {
        return (
          <div className="flex h-10 items-center gap-2 rounded-md border border-dashed border-muted bg-muted/40 px-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("modules.newServerModal.blueprint.loadingVersions")}
          </div>
        );
      }
      return (
        <Select
          value={String(value ?? "")}
          onValueChange={(v) => v != null && onChange(v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={t("modules.newServerModal.blueprint.selectVersion")}
            />
          </SelectTrigger>
          <SelectContent>
            {versions.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (fromStatic && variable.options?.from === "static") {
      return (
        <Select
          value={String(value ?? "")}
          onValueChange={(v) => v != null && onChange(v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={t(
                "modules.newServerModal.blueprint.selectOption",
                label
              )}
            />
          </SelectTrigger>
          <SelectContent>
            {variable.options.values.map((opt) => (
              <SelectItem key={String(opt)} value={String(opt)}>
                {String(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (variable.type === "boolean") {
      return (
        <Switch
          checked={!!value}
          onCheckedChange={(checked) => onChange(checked)}
        />
      );
    }

    if (variable.type === "number") {
      return (
        <Input
          type="number"
          value={value === undefined ? "" : String(value)}
          onChange={(e) =>
            onChange(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      );
    }

    return (
      <Input
        type={variable.type === "secret" ? "password" : "text"}
        value={value === undefined ? "" : String(value)}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={variable.key}>{label}</Label>
      {renderControl()}
      {variable.description && (
        <p className="text-xs text-muted-foreground">{variable.description}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
