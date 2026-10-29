"use client";
import { useJavaVersionForGame } from "@/modules/java-manager/api/java.queries";
import type { Server } from "@/modules/server";
import { buildAikarFlags } from "@/modules/server/modals/CreateServerModal/wizard/jvm";
import { JavaVersionField } from "@/modules/server/ui/JavaVersionField";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { useHostMetrics } from "@/modules/system-monitoring/store/host-metrics.store";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { SettingsField, SettingsGroup } from "@/shared/ui/settings";
import { Slider } from "@/shared/ui/slider";
import { Textarea } from "@/shared/ui/textarea";
import { Activity, AlertTriangle, Code, Coffee, Cpu, Gauge, Zap } from "lucide-react";
import type { SettingsDraft } from "../hooks/useSettingsDraft";

const MB = 1024 * 1024;
const MEMORY_STEP_MB = 256;
const MEMORY_MIN_MB = 512;
// Used for the slider range until the first host sample arrives
const FALLBACK_HOST_MB = 16 * 1024;

const gb = (mb: number) => (mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1);

export function JavaTab({ server, draft }: { server: Server; draft: SettingsDraft }) {
  const { t } = useTranslation("modules.serverSettings.java");
  const blueprint = useBlueprint(server.blueprintId);
  const has = (key: string) => blueprint?.variables.some((v) => v.key === key) ?? false;
  const versionKey = blueprint?.variables.find((v) => v.options?.from === "versions")?.key;
  const gameVersion = versionKey ? String(draft.values.variable(versionKey) ?? "") : "";

  const ramTotal = useHostMetrics((s) => s.ramTotal);
  const ramUsed = useHostMetrics((s) => s.ramUsed);
  const hostMb = ramTotal ? Math.floor(ramTotal / MB) : FALLBACK_HOST_MB;
  const freeGb = ramTotal ? ((ramTotal - ramUsed) / MB / 1024).toFixed(1) : null;

  const javaVersion = Number(draft.values.variable("JAVA_VERSION") ?? 0);
  const javaPath = String(draft.values.variable("JAVA_PATH") ?? "");
  const { data: recommended } = useJavaVersionForGame(has("JAVA_VERSION") && gameVersion ? gameVersion : undefined);
  const needsNewer = typeof recommended === "number" && !javaPath && javaVersion > 0 && javaVersion < recommended;

  const xmx = Number(draft.values.variable("XMX") ?? 2048);
  const xmsChanged = draft.variableChanged("XMS");

  return (
    <SettingsGroup tone="orange" icon={Cpu} title={t("title")} description={t("description")}>
      <SettingsField
        label={t("javaVersion")}
        icon={Coffee}
        wide
        changed={draft.variableChanged("JAVA_VERSION") || draft.variableChanged("JAVA_PATH")}
        hint={
          needsNewer ? (
            <span className="flex items-center gap-1.5 text-warn">
              <AlertTriangle className="size-3.5" />
              {t("requires", gameVersion, recommended)}
            </span>
          ) : undefined
        }
      >
        <JavaVersionField
          value={javaVersion || undefined}
          recommendedVersion={typeof recommended === "number" ? recommended : null}
          onChange={(version) => {
            draft.setVariable("JAVA_VERSION", version);
            // A managed version replaces any custom binary
            draft.setVariable("JAVA_PATH", "");
          }}
          pathValue={javaPath}
          // Docker images ship their own Java, no host path override there
          onPathChange={server.runtimeKind === "docker" ? undefined : (path) => path && draft.setVariable("JAVA_PATH", path)}
        />
      </SettingsField>

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
              onValueChange={(value) => draft.setVariable("XMX", Array.isArray(value) ? value[0] : value)}
              aria-label={t("memory")}
            />
            <output className="text-right font-mono text-[13px] tabular-nums">{gb(xmx)} GB</output>
          </div>
        </SettingsField>
      )}

      {has("XMS") && (
        <SettingsField label={t("initialMemory")} icon={Gauge} hint={t("initialMemoryHint")} changed={xmsChanged} htmlFor="java-xms">
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
        <SettingsField label={t("arguments")} icon={Code} hint={t("argumentsHint")} wide changed={draft.variableChanged("JVM_ARGS")} htmlFor="java-args">
          <Textarea
            id="java-args"
            rows={3}
            className="font-mono text-xs"
            value={String(draft.values.variable("JVM_ARGS") ?? "")}
            onChange={(e) => draft.setVariable("JVM_ARGS", e.target.value)}
          />
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => draft.setVariable("JVM_ARGS", buildAikarFlags(xmx).join(" "))}>
              <Zap />
              {t("presets.aikar")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => draft.setVariable("JVM_ARGS", "")}>
              {t("presets.minimal")}
            </Button>
          </div>
        </SettingsField>
      )}
    </SettingsGroup>
  );
}
