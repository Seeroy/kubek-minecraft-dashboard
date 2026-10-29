import { useServerFoldersQuery } from "@/modules/server/api/server-folders.queries";
import { useHostMetrics } from "@/modules/system-monitoring/store/host-metrics.store";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { cn } from "@/shared/lib/cn";
import type { BlueprintSummary } from "@/shared/types/server-types.types";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/shared/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Slider } from "@/shared/ui/slider";
import { Switch } from "@/shared/ui/switch";
import { Activity, Code, Container, FileText, Folder, type LucideIcon, Play, SlidersHorizontal, Terminal, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import type { WizardValues } from "./buildBlueprintSchema";
import { buildJvmArgs, splitArgs } from "./jvm";
import { WizardField, WizardSection } from "./WizardField";

const MB = 1024 * 1024;
const SLIDER_MIN = 512;
const SLIDER_STEP = 512;
const SLIDER_FALLBACK_MAX = 16384;
const NO_FOLDER = "";

interface SwitchRowProps {
  icon: LucideIcon;
  label: ReactNode;
  description: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: ReactNode;
}

export function SwitchRow({ icon: Icon, label, description, checked, onChange, disabled, error }: SwitchRowProps) {
  return (
    <label className={cn("flex items-center justify-between gap-4 py-3 not-first:border-t not-first:border-border", disabled ? "opacity-55" : "cursor-pointer")}>
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-medium">
          <Icon className="size-3.5 text-muted-foreground" />
          {label}
        </span>
        <span className="mt-0.5 block max-w-[60ch] pl-[22px] text-xs text-muted-foreground">{description}</span>
        {error && <span className="mt-1 block pl-[22px] text-xs text-danger">{error}</span>}
      </span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </label>
  );
}

interface AdvancedStepProps {
  form: UseFormReturn<WizardValues>;
  blueprint: BlueprintSummary;
  dockerAvailable: boolean;
}

export function AdvancedStep({ form, blueprint, dockerAvailable }: AdvancedStepProps) {
  const { t } = useTranslation("modules.newServerModal.advanced");
  const { t: tRoot } = useTranslation();
  const { errors } = form.formState;
  const [variables, aikar, extraArgs, runtimeDocker, autostart, eula, folderId] = useWatch({
    control: form.control,
    name: ["variables", "aikar", "extraArgs", "runtimeDocker", "autostart", "eula", "folderId"],
  });
  const folders = useServerFoldersQuery();
  const ramFree = useHostMetrics((s) => s.ramTotal - s.ramUsed);
  const ramTotal = useHostMetrics((s) => s.ramTotal);

  const hasMemory = blueprint.variables.some((v) => v.key === "XMX");
  const hasJvmArgs = blueprint.variables.some((v) => v.key === "JVM_ARGS");
  const xms = Number(variables?.XMS);
  const xmx = Number(variables?.XMX);
  const sliderMax = ramTotal ? Math.max(SLIDER_STEP * 2, Math.floor(ramTotal / MB / SLIDER_STEP) * SLIDER_STEP) : SLIDER_FALLBACK_MAX;
  const set = (key: "aikar" | "runtimeDocker" | "autostart" | "eula") => (value: boolean) => form.setValue(key, value, { shouldValidate: true });

  // Bare min and max zod messages map to the range hint
  const memoryError = (message: string | undefined) => (message ? (message.startsWith("modules.") ? tRoot(message) : t("memory.errors.range")) : undefined);
  const memoryMessage = memoryError(errors.variables?.XMS?.message) ?? memoryError(errors.variables?.XMX?.message);

  const memoryInput = (key: "XMS" | "XMX") => (
    <InputGroup>
      <InputGroupInput
        id={`memory-${key}`}
        type="number"
        min={256}
        step={256}
        className="text-right tabular-nums"
        aria-invalid={!!errors.variables?.[key]}
        {...form.register(`variables.${key}`, { valueAsNumber: true })}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupText>{t("memory.unit")}</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  );

  return (
    <>
      {hasMemory && (
        <WizardSection icon={Activity} tone="pink" title={t("memory.label")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <WizardField label={t("memory.xms.label")} htmlFor="memory-XMS">
              {memoryInput("XMS")}
            </WizardField>
            <WizardField label={t("memory.xmx.label")} htmlFor="memory-XMX">
              {memoryInput("XMX")}
            </WizardField>
          </div>
          <Slider
            className="mt-4"
            min={SLIDER_MIN}
            max={sliderMax}
            step={SLIDER_STEP}
            value={[Number.isFinite(xmx) ? Math.min(Math.max(xmx, SLIDER_MIN), sliderMax) : SLIDER_MIN]}
            onValueChange={(value) => form.setValue("variables.XMX", Array.isArray(value) ? value[0] : value, { shouldValidate: true })}
            aria-label={t("memory.slider")}
          />
          <p className={cn("mt-2 text-xs", memoryMessage ? "text-danger" : "text-muted-foreground")}>
            {memoryMessage ?? [t("memory.help"), ramTotal ? t("memory.free", formatBytes(ramFree)) : null].filter(Boolean).join(". ")}
          </p>
        </WizardSection>
      )}

      <WizardSection icon={SlidersHorizontal} tone="purple" title={t("launch")}>
        {hasJvmArgs && <SwitchRow icon={Zap} label={t("aikar.label")} description={t("aikar.description")} checked={aikar} onChange={set("aikar")} />}
        {blueprint.dockerCapable && (
          <SwitchRow
            icon={Container}
            label={
              <>
                {t("docker.label")}
                <Badge variant="warning">{t("docker.beta")}</Badge>
              </>
            }
            description={dockerAvailable ? t("docker.description") : t("docker.unavailable")}
            checked={dockerAvailable && runtimeDocker}
            disabled={!dockerAvailable}
            onChange={set("runtimeDocker")}
          />
        )}
        <SwitchRow icon={Play} label={t("autostart.label")} description={t("autostart.description")} checked={autostart} onChange={set("autostart")} />
        <SwitchRow
          icon={FileText}
          label={t("eula.label")}
          description={
            <>
              {t("eula.description")}{" "}
              <a href="https://aka.ms/MinecraftEULA" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                {t("eula.link")}
              </a>
            </>
          }
          checked={eula}
          onChange={set("eula")}
          error={!eula && t("eula.required")}
        />

        <div className="mt-3 grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <WizardField label={t("folder.label")} icon={Folder} htmlFor="server-folder">
            <Select value={folderId ?? NO_FOLDER} onValueChange={(next) => form.setValue("folderId", next || null)}>
              <SelectTrigger id="server-folder" className="w-full">
                <SelectValue>{(value: string) => folders.data?.find((f) => f.id === value)?.name ?? t("folder.none")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FOLDER}>{t("folder.none")}</SelectItem>
                {folders.data?.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </WizardField>

          {hasJvmArgs && (
            <WizardField label={t("startupArguments.label")} icon={Code} htmlFor="extra-args" hint={t("startupArguments.help")}>
              <Input id="extra-args" className="font-mono" placeholder={t("startupArguments.placeholder")} {...form.register("extraArgs")} />
            </WizardField>
          )}

          {hasMemory && (
            <WizardField label={t("preview.label")} icon={Terminal} wide>
              <pre className="max-h-[120px] scrollbar-thin overflow-auto rounded-md border border-border bg-subtle p-3 font-mono text-[11.5px] leading-relaxed break-all whitespace-pre-wrap text-muted-foreground">
                <b className="font-medium text-foreground">
                  -Xms{Number.isFinite(xms) ? xms : 0}M -Xmx{Number.isFinite(xmx) ? xmx : 0}M
                </b>{" "}
                {buildJvmArgs({ maxMemoryMb: Number.isFinite(xmx) ? xmx : 0, useAikarFlags: aikar && hasJvmArgs, extraArguments: splitArgs(extraArgs) }).join(" ")}
              </pre>
            </WizardField>
          )}
        </div>
      </WizardSection>
    </>
  );
}
