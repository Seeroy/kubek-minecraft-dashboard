"use client";
import type { Server } from "@/modules/server";
import { VariableControl } from "@/modules/server/ui/VariableControl";
import { ServerAvatar } from "@/modules/server/ui/ServerAvatar";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAccess } from "@/shared/lib/access";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { SettingsField, SettingsGroup } from "@/shared/ui/settings";
import { Spinner } from "@/shared/ui/spinner";
import { Switch } from "@/shared/ui/switch";
import { AccessArea } from "@shared/access/areas";
import { Hash, Image, KeyRound, List, RefreshCw, RotateCw, Server as ServerIcon, Sliders, Tag, ToggleLeft, Type, Upload, type LucideIcon } from "lucide-react";
import type { BlueprintVariable } from "@/shared/types/server-types.types";
import { JAVA_VARIABLES, type SettingsDraft } from "../hooks/useSettingsDraft";
import { useServerIconUpload } from "../hooks/useServerIconUpload";
import { ServerCoreGroup } from "./ServerCoreGroup";

function variableIcon(variable: BlueprintVariable): LucideIcon {
  if (variable.options?.from === "static") return List;
  if (variable.type === "boolean") return ToggleLeft;
  if (variable.type === "number") return Hash;
  if (variable.type === "secret") return KeyRound;
  return Type;
}

export function GeneralTab({ server, draft }: { server: Server; draft: SettingsDraft }) {
  const { t } = useTranslation("modules.serverSettings.general");
  const { inputRef, onChange: onIconChange, pick: pickIcon, uploading } = useServerIconUpload(server.id);
  const canChangeCore = useAccess([AccessArea.SETTINGS, "manage"], server.id);
  const blueprint = useBlueprint(server.blueprintId);
  const restart = draft.values.restartOnError;

  // Version is fixed once the core is provisioned, Java and memory live on their own tab
  const variables = (blueprint?.variables ?? []).filter(
    (v) => v.userEditable !== false && v.editableAfterInstall !== false && !JAVA_VARIABLES.has(v.key) && v.options?.from !== "versions"
  );

  return (
    <>
      <SettingsGroup tone="blue" icon={ServerIcon} title={t("basicInformation.title")} description={t("basicInformation.description")}>
        <SettingsField label={t("basicInformation.serverName")} icon={Tag} htmlFor="server-name" changed={draft.nameChanged}>
          <Input id="server-name" value={draft.values.name} placeholder={t("basicInformation.serverNamePlaceholder")} onChange={(e) => draft.setName(e.target.value)} />
        </SettingsField>
        <SettingsField label={t("basicInformation.serverIcon")} icon={Image} hint={t("basicInformation.recommendedFormat")}>
          <div className="flex items-center gap-3">
            <ServerAvatar serverId={server.id} name={server.name} className="size-12 rounded-md" />
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={onIconChange} />
            <Button variant="outline" onClick={pickIcon} disabled={uploading}>
              {uploading ? <Spinner /> : <Upload />}
              {uploading ? t("basicInformation.uploading") : t("basicInformation.uploadIcon")}
            </Button>
          </div>
        </SettingsField>
      </SettingsGroup>

      {variables.length > 0 && (
        <SettingsGroup tone="amber" icon={Sliders} title={t("variables.title")} description={t("variables.description")}>
          {variables.map((variable) => (
            <SettingsField
              key={variable.key}
              label={variable.label ?? variable.key}
              icon={variableIcon(variable)}
              hint={variable.description}
              inline={variable.type === "boolean"}
              changed={draft.variableChanged(variable.key)}
              htmlFor={variable.key}
            >
              <VariableControl
                id={variable.key}
                label={variable.label ?? variable.key}
                variable={variable}
                value={draft.values.variable(variable.key)}
                onChange={(value) => draft.setVariable(variable.key, value)}
              />
            </SettingsField>
          ))}
        </SettingsGroup>
      )}

      <SettingsGroup tone="green" icon={RefreshCw} title={t("autoRestartSettings.title")} description={t("autoRestartSettings.description")}>
        <SettingsField
          inline
          icon={RotateCw}
          label={t("autoRestartSettings.enableAutoRestart")}
          hint={t("autoRestartSettings.enableAutoRestartDescription")}
          changed={draft.restartChanged}
        >
          <Switch checked={restart.enabled} onCheckedChange={(enabled) => draft.setRestart({ ...restart, enabled })} />
        </SettingsField>
        {restart.enabled && (
          <SettingsField label={t("autoRestartSettings.maxRestartAttempts")} icon={RotateCw} hint={t("autoRestartSettings.maxRestartAttemptsHelp")} htmlFor="restart-attempts">
            <Input
              id="restart-attempts"
              type="number"
              min={1}
              max={10}
              className="max-w-28"
              value={restart.attempts}
              onChange={(e) => draft.setRestart({ ...restart, attempts: Number.parseInt(e.target.value, 10) || 1 })}
            />
          </SettingsField>
        )}
      </SettingsGroup>

      {canChangeCore && <ServerCoreGroup server={server} />}
    </>
  );
}
