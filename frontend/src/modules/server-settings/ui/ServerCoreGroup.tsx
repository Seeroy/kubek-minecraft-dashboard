"use client";
import type { Server } from "@/modules/server";
import { iconType } from "@/modules/server-types/lib/blueprint";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { confirmDialog } from "@/shared/modals";
import { BlueprintIcon } from "@/shared/ui/BlueprintIcon";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { SettingsField, SettingsGroup } from "@/shared/ui/settings";
import { Spinner } from "@/shared/ui/spinner";
import { Box, Boxes, FileArchive, Tag } from "lucide-react";
import { useServerCoreSettings } from "../hooks/useServerCoreSettings";

export function ServerCoreGroup({ server }: { server: Server }) {
  const { t } = useTranslation("modules.serverSettings.general.coreSettings");
  const core = useServerCoreSettings(server);
  const disabled = !core.isStopped || core.isApplying;

  const apply = async () => {
    const ok = await confirmDialog({
      title: t("confirmTitle"),
      description: t("confirmDescription"),
      confirmText: t("confirmAction"),
      cancelText: t("cancel"),
      icon: Boxes,
    });
    if (ok) core.apply();
  };

  return (
    <SettingsGroup
      tone="purple"
      icon={Boxes}
      title={t("title")}
      description={t("description")}
      note={!core.isStopped ? t("mustBeStopped") : undefined}
    >
      <SettingsField label={t("core")} icon={Box}>
        <Select value={core.blueprintId} onValueChange={(v) => v && core.setBlueprintId(String(v))} disabled={disabled || core.blueprintsLoading}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("chooseCore")}>
              {(value) => {
                const bp = core.blueprints.find((b) => b.id === value);
                return bp ? (bp.shortName ?? bp.name) : t("chooseCore");
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {core.blueprints.map((bp) => (
              <SelectItem key={bp.id} value={bp.id}>
                <BlueprintIcon icon={bp.icon} coreType={iconType(bp.id)} label={bp.name} className="size-4" />
                {bp.shortName ?? bp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsField>

      {core.hasVersions && (
        <SettingsField label={t("version")} icon={Tag}>
          <Select value={core.version} onValueChange={(v) => v && core.setVersion(String(v))} disabled={disabled || core.versionsLoading}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={core.versionsLoading ? t("loadingVersions") : t("chooseVersion")} />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {core.versions.length === 0 ? (
                <div className="py-4 text-center text-[13px] text-muted-foreground">{t("noVersions")}</div>
              ) : (
                core.versions.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </SettingsField>
      )}

      {core.isCustomChosen && (
        <SettingsField label={t("customDropzone")} icon={FileArchive} wide hint={core.customFile && t("customSelected", { name: core.customFile.name })}>
          <Input type="file" accept=".jar" disabled={disabled} onChange={(e) => core.setCustomFile(e.target.files?.[0])} />
        </SettingsField>
      )}

      <div className="col-span-full flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
          <BlueprintIcon icon={core.currentBlueprint?.icon} coreType={iconType(server.blueprintId)} label={core.currentBlueprint?.name ?? server.blueprintId} className="size-5" />
          {t("currentCore")}: <b className="font-medium text-foreground">{core.currentBlueprint?.name ?? server.blueprintId}{core.currentVersion ? ` · ${core.currentVersion}` : ""}</b>
        </span>
        <Button onClick={apply} disabled={!core.canApply || core.isApplying}>
          {core.isApplying && <Spinner />}
          {core.isApplying ? t("applying") : t("apply")}
        </Button>
      </div>
    </SettingsGroup>
  );
}
