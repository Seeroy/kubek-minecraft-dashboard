"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { confirmDialog } from "@/shared/modals/confirm";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { BlueprintIcon } from "@/shared/ui/BlueprintIcon";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Boxes, Loader2, UploadCloud } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { useServerCoreSettings } from "../../hooks/useServerCoreSettings";

// The bundled blueprint id suffix matches the core icon asset name
const iconType = (id: string) => id.split(".").pop() ?? "custom";

/**
 * Lets the user switch a stopped server to a different core and version
 */
export const ServerCoreCard = () => {
  const { t } = useTranslation("modules.serverSettings");
  const {
    selectedServer,
    blueprints,
    blueprintsLoading,
    blueprintId,
    setBlueprintId,
    hasVersions,
    versions,
    versionsLoading,
    version,
    setVersion,
    currentBlueprint,
    currentVersion,
    isStopped,
    isCustomChosen,
    customFile,
    setCustomFile,
    canApply,
    isApplying,
    applyCoreChange,
  } = useServerCoreSettings();

  if (!selectedServer) return null;

  const tc = (key: string) => t(`general.coreSettings.${key}`);

  const handleApply = async () => {
    const ok = await confirmDialog({
      title: tc("confirmTitle"),
      description: tc("confirmDescription"),
      confirmText: tc("confirmAction"),
      cancelText: tc("cancel"),
    });
    if (ok) applyCoreChange();
  };

  return (
    <Card>
      <CardHeader>
        <BlockHeader
          kicker={tc("title")}
          title={tc("title")}
          description={tc("description")}
          icon={Boxes}
          color="purple"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current core summary */}
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <BlueprintIcon
            icon={currentBlueprint?.icon}
            coreType={iconType(selectedServer.blueprintId)}
            label={currentBlueprint?.name ?? selectedServer.blueprintId}
            className="size-6"
          />
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">
              {tc("currentCore")}
            </span>
            <span className="text-sm font-medium">
              {currentBlueprint?.name ?? selectedServer.blueprintId}
              {currentVersion ? ` · ${currentVersion}` : ""}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Core selector */}
          <div className="space-y-2">
            <Label className="text-sm">{tc("core")}</Label>
            <Select
              value={blueprintId}
              onValueChange={(v) => v != null && setBlueprintId(v)}
              disabled={!isStopped || blueprintsLoading || isApplying}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={tc("chooseCore")}>
                  {(value) => {
                    const bp = blueprints.find((b) => b.id === value);
                    return bp ? (bp.shortName ?? bp.name) : tc("chooseCore");
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {blueprints.map((bp) => (
                  <SelectItem key={bp.id} value={bp.id}>
                    <span className="flex items-center gap-2">
                      <BlueprintIcon
                        icon={bp.icon}
                        coreType={iconType(bp.id)}
                        label={bp.name}
                        className="size-4"
                      />
                      {bp.shortName ?? bp.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Version selector (only for cores that offer a version list) */}
          {hasVersions && (
            <div className="space-y-2">
              <Label className="text-sm">{tc("version")}</Label>
              <Select
                value={version}
                onValueChange={(v) => v != null && setVersion(v)}
                disabled={!isStopped || versionsLoading || isApplying}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={tc("chooseVersion")} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {versionsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="text-sm">{tc("loadingVersions")}</span>
                    </div>
                  ) : versions.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      {tc("noVersions")}
                    </div>
                  ) : (
                    versions.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Custom core needs a user-supplied jar */}
        {isCustomChosen && (
          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-muted p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UploadCloud className="size-4" />
              {tc("customDropzone")}
            </div>
            <Input
              type="file"
              accept=".jar"
              disabled={!isStopped || isApplying}
              onChange={(e) => setCustomFile(e.target.files?.[0])}
            />
            {customFile && (
              <p className="text-sm text-green-600">
                {t("general.coreSettings.customSelected", {
                  name: customFile.name,
                })}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          {!isStopped && (
            <p className="text-xs text-amber-500">{tc("mustBeStopped")}</p>
          )}
          <div className="ml-auto">
            <Button disabled={!canApply || isApplying} onClick={handleApply}>
              {isApplying ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {tc("applying")}
                </>
              ) : (
                tc("apply")
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
