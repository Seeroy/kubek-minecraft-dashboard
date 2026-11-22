"use client";
import { useJavaVersionForGame } from "@/modules/java-manager/api/java.queries";
import type { Server } from "@/modules/server";
import { JavaVersionField } from "@/modules/server/ui/JavaVersionField";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { SettingsField, SettingsGroup } from "@/shared/ui/settings";
import { AlertTriangle, Coffee, Cpu } from "lucide-react";
import type { SettingsDraft } from "../hooks/useSettingsDraft";

export function JavaTab({ server, draft }: { server: Server; draft: SettingsDraft }) {
  const { t } = useTranslation("modules.serverSettings.java");
  const blueprint = useBlueprint(server.blueprintId);
  const has = (key: string) => blueprint?.variables.some((v) => v.key === key) ?? false;
  const versionKey = blueprint?.variables.find((v) => v.options?.from === "versions")?.key;
  const gameVersion = versionKey ? String(draft.values.variable(versionKey) ?? "") : "";

  const javaVersion = Number(draft.values.variable("JAVA_VERSION") ?? 0);
  const javaPath = String(draft.values.variable("JAVA_PATH") ?? "");
  const { data: recommended } = useJavaVersionForGame(has("JAVA_VERSION") && gameVersion ? gameVersion : undefined);
  const needsNewer = typeof recommended === "number" && !javaPath && javaVersion > 0 && javaVersion < recommended;

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
    </SettingsGroup>
  );
}
