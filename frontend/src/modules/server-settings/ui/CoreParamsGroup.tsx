"use client";
import type { Server } from "@/modules/server";
import { isProxyBlueprint } from "@/modules/server/modals/CreateServerModal/wizard/jvm";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { useHostMetrics } from "@/modules/system-monitoring/store/host-metrics.store";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Input } from "@/shared/ui/input";
import { SettingsField, SettingsGroup } from "@/shared/ui/settings";
import { Slider } from "@/shared/ui/slider";
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import { Activity, Code, Cpu, Gauge, Languages, Zap } from "lucide-react";
import type { SettingsDraft } from "../hooks/useSettingsDraft";
import { composeJvmArgs, parseJvmArgs, type JvmArgsParts } from "../lib/jvmArgs";

const MB = 1024 * 1024;
const MEMORY_STEP_MB = 256;
const MEMORY_MIN_MB = 512;
// Used for the slider range until the first host sample arrives
const FALLBACK_HOST_MB = 16 * 1024;

const gb = (mb: number) => (mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1);

/** Memory and JVM flags of the server core */
export function CoreParamsGroup({ server, draft }: { server: Server; draft: SettingsDraft }) {
  const { t } = useTranslation("modules.serverSettings.coreParams");
  const blueprint = useBlueprint(server.blueprintId);
  const has = (key: string) => blueprint?.variables.some((v) => v.key === key) ?? false;
  const proxy = isProxyBlueprint(blueprint);
  const tunedText = proxy ? "proxyFlags" : "aikar";

  const ramTotal = useHostMetrics((s) => s.ramTotal);
  const ramUsed = useHostMetrics((s) => s.ramUsed);
  const hostMb = ramTotal ? Math.floor(ramTotal / MB) : FALLBACK_HOST_MB;
  const freeGb = ramTotal ? ((ramTotal - ramUsed) / MB / 1024).toFixed(1) : null;

  const xmx = Number(draft.values.variable("XMX") ?? 2048);
  const rawArgs = String(draft.values.variable("JVM_ARGS") ?? "");
  const args = parseJvmArgs(rawArgs, proxy);
  const savedArgs = parseJvmArgs(String(draft.savedVariable("JVM_ARGS") ?? ""), proxy);
  // The switches and the field share one variable, each switch shows its own change
  const partChanged = (part: "tuned" | "utf8") => draft.variableChanged("JVM_ARGS") && args[part] !== savedArgs[part];
  const setArgs = (next: Partial<JvmArgsParts>, memoryMb = xmx) =>
    draft.setVariable("JVM_ARGS", composeJvmArgs({ ...args, ...next }, memoryMb, proxy));

  const setMemory = (mb: number) => {
    draft.setVariable("XMX", mb);
    // Aikar's set depends on the heap size
    if (args.tuned && !proxy && has("JVM_ARGS")) setArgs({}, mb);
  };

  if (!has("XMX") && !has("XMS") && !has("JVM_ARGS")) return null;

  return (
    <SettingsGroup tone="orange" icon={Cpu} title={t("title")} description={t("description")}>
      {has("XMX") && (
        <SettingsField
          label={t("memory")}
          icon={Activity}
          wide
          changed={draft.variableChanged("XMX")}
          hint={freeGb ? t("memoryHint", freeGb) : t("memoryHintNoHost")}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-4">
            <Slider
              min={MEMORY_MIN_MB}
              max={Math.max(hostMb, xmx)}
              step={MEMORY_STEP_MB}
              value={[xmx]}
              onValueChange={(value) => setMemory(Array.isArray(value) ? value[0] : value)}
              aria-label={t("memory")}
            />
            <output className="text-right font-mono text-[13px] tabular-nums">{gb(xmx)} GB</output>
          </div>
        </SettingsField>
      )}

      {has("XMS") && (
        <SettingsField label={t("initialMemory")} icon={Gauge} hint={t("initialMemoryHint")} changed={draft.variableChanged("XMS")} htmlFor="java-xms">
          <Input
            id="java-xms"
            type="number"
            min={256}
            step={MEMORY_STEP_MB}
            value={String(draft.values.variable("XMS") ?? "")}
            onChange={(e) => draft.setVariable("XMS", Number(e.target.value))}
          />
        </SettingsField>
      )}

      {has("JVM_ARGS") && (
        <>
          <SettingsField label={t(`${tunedText}.label`)} icon={Zap} hint={t(`${tunedText}.description`)} changed={partChanged("tuned")} inline>
            <Switch checked={args.tuned} onCheckedChange={(tuned) => setArgs({ tuned })} aria-label={t(`${tunedText}.label`)} />
          </SettingsField>
          <SettingsField label={t("utf8.label")} icon={Languages} hint={t("utf8.description")} changed={partChanged("utf8")} inline>
            <Switch checked={args.utf8} onCheckedChange={(utf8) => setArgs({ utf8 })} aria-label={t("utf8.label")} />
          </SettingsField>
          <SettingsField label={t("arguments")} icon={Code} hint={t("argumentsHint")} wide changed={draft.variableChanged("JVM_ARGS")} htmlFor="java-args">
            <Textarea
              id="java-args"
              rows={5}
              className="font-mono text-xs"
              value={rawArgs}
              onChange={(e) => draft.setVariable("JVM_ARGS", e.target.value)}
            />
          </SettingsField>
        </>
      )}
    </SettingsGroup>
  );
}
