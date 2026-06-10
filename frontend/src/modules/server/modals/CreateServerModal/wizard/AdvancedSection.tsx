import { useLanguageContext } from "@/shared/context/language-context";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { MemoryStick, Plus, Sparkles, Terminal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import type { WizardValues } from "./buildBlueprintSchema";
import { buildJvmArgs } from "./jvm";

interface AdvancedSectionProps {
  form: UseFormReturn<WizardValues>;
  minMemoryKey: string;
  maxMemoryKey: string;
  argsKey: string;
}

// Memory writes to XMS/XMX; the Aikar toggle and extra args flatten into JVM_ARGS
export function AdvancedSection({
  form,
  minMemoryKey,
  maxMemoryKey,
  argsKey,
}: AdvancedSectionProps) {
  const { t } = useLanguageContext();
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = form;

  const [useAikarFlags, setUseAikarFlags] = useState(false);
  const [extraArguments, setExtraArguments] = useState<string[]>([]);
  const [newArg, setNewArg] = useState("");

  const xms = useWatch({ control, name: `variables.${minMemoryKey}` }) as
    | number
    | undefined;
  const xmx = useWatch({ control, name: `variables.${maxMemoryKey}` }) as
    | number
    | undefined;
  const maxMemoryMb = Number.isFinite(xmx) ? Number(xmx) : 0;

  // Keep JVM_ARGS in sync with inputs
  useEffect(() => {
    const args = buildJvmArgs({ maxMemoryMb, useAikarFlags, extraArguments });
    setValue(`variables.${argsKey}`, args.join(" "), { shouldValidate: true });
  }, [maxMemoryMb, useAikarFlags, extraArguments, argsKey, setValue]);

  const addArgument = () => {
    const value = newArg.trim();
    if (!value) return;
    setExtraArguments((prev) => [...prev, value]);
    setNewArg("");
  };

  const removeArgument = (index: number) => {
    setExtraArguments((prev) => prev.filter((_, i) => i !== index));
  };

  // Raw min/max messages map to the range hint
  const memoryError = (message?: string) => {
    if (!message) return null;
    if (message.startsWith("modules.")) return t(message);
    return t("modules.newServerModal.advanced.memory.errors.range");
  };
  const xmsError = memoryError(
    errors.variables?.[minMemoryKey]?.message as string | undefined
  );
  const xmxError = memoryError(
    errors.variables?.[maxMemoryKey]?.message as string | undefined
  );

  // Preview of the launch flags
  const previewArguments = [
    `-Xms${Number.isFinite(xms) ? Number(xms) : 0}M`,
    `-Xmx${maxMemoryMb}M`,
    ...buildJvmArgs({ maxMemoryMb, useAikarFlags, extraArguments }),
  ];

  return (
    <div className="h-full space-y-5 rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <span className="font-medium">
          {t("modules.newServerModal.advanced.title")}
        </span>
      </div>

      {/* Memory allocation */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MemoryStick className="size-4 text-muted-foreground" />
          <Label>{t("modules.newServerModal.advanced.memory.label")}</Label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label
              htmlFor="memoryMin"
              className="text-xs text-muted-foreground"
            >
              {t("modules.newServerModal.advanced.memory.xms.label")}
            </Label>
            <div className="relative">
              <Input
                id="memoryMin"
                type="number"
                min={256}
                step={256}
                className="pr-12"
                {...register(`variables.${minMemoryKey}`, {
                  valueAsNumber: true,
                })}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                {t("modules.newServerModal.advanced.memory.unit")}
              </span>
            </div>
            {xmsError && <p className="text-sm text-destructive">{xmsError}</p>}
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="memoryMax"
              className="text-xs text-muted-foreground"
            >
              {t("modules.newServerModal.advanced.memory.xmx.label")}
            </Label>
            <div className="relative">
              <Input
                id="memoryMax"
                type="number"
                min={256}
                step={256}
                className="pr-12"
                {...register(`variables.${maxMemoryKey}`, {
                  valueAsNumber: true,
                })}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                {t("modules.newServerModal.advanced.memory.unit")}
              </span>
            </div>
            {xmxError && <p className="text-sm text-destructive">{xmxError}</p>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("modules.newServerModal.advanced.memory.help")}
        </p>
      </div>

      {/* Aikar's flags toggle */}
      <div className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/40 p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="font-medium">
              {t("modules.newServerModal.advanced.aikar.label")}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("modules.newServerModal.advanced.aikar.description")}
          </p>
        </div>
        <Switch checked={useAikarFlags} onCheckedChange={setUseAikarFlags} />
      </div>

      {/* Extra startup arguments */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Terminal className="size-4 text-muted-foreground" />
          <Label>
            {t("modules.newServerModal.advanced.startupArguments.label")}
          </Label>
        </div>
        <div className="space-y-2">
          {extraArguments.map((arg, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={arg}
                readOnly
                className="flex-1 font-mono text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeArgument(index)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input
              placeholder={t(
                "modules.newServerModal.advanced.startupArguments.placeholder"
              )}
              value={newArg}
              onChange={(e) => setNewArg(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addArgument();
                }
              }}
              className="font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addArgument}
              className="shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("modules.newServerModal.advanced.startupArguments.help")}
        </p>
      </div>

      {/* Effective arguments preview */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          {t("modules.newServerModal.advanced.preview.label")}
        </Label>
        <pre className="max-h-32 overflow-y-auto rounded-lg border border-border/60 bg-background/40 p-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap text-muted-foreground">
          {previewArguments.join(" ")}
        </pre>
      </div>
    </div>
  );
}
