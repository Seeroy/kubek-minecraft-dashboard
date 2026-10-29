"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import type { BlueprintSummary } from "@/shared/types/server-types.types";
import { Badge } from "@/shared/ui/badge";
import { BlueprintIcon } from "@/shared/ui/BlueprintIcon";
import { Button } from "@/shared/ui/button";
import { KeyValue, KeyValueItem } from "@/shared/ui/key-value";
import { toneClass } from "@/shared/ui/tone";
import { Trash2 } from "lucide-react";
import { FEATURE_TONE, iconType } from "../lib/blueprint";


interface BlueprintCardProps {
  blueprint: BlueprintSummary;
  usedBy: number;
  canRemove: boolean;
  busy: boolean;
  onRemove: () => void;
}

export function BlueprintCard({ blueprint, usedBy, canRemove, busy, onRemove }: BlueprintCardProps) {
  const { t } = useTranslation("modules.serverTypes");
  const runtimes = blueprint.runtimeKind === "docker" ? "Docker" : blueprint.dockerCapable ? "Native · Docker" : "Native";

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/18">
      <div className="flex items-center gap-3">
        <BlueprintIcon icon={blueprint.icon} coreType={iconType(blueprint.id)} label={blueprint.name} className="size-10 rounded-[10px]" />
        <div className="min-w-0 flex-1">
          <b className="block truncate text-[14.5px] font-semibold">{blueprint.name}</b>
          <small className="block truncate font-mono text-xs text-muted-foreground">{blueprint.id}</small>
        </div>
        <Badge variant={blueprint.source === "bundled" ? "secondary" : "info"}>{t(`source.${blueprint.source}`)}</Badge>
      </div>

      {blueprint.description && <p className="min-h-[38px] text-[12.5px] leading-normal text-muted-foreground">{blueprint.description}</p>}

      {blueprint.features.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {blueprint.features.map((feature) => (
            <Badge key={feature} className={cn("bg-tone/12 text-tone", toneClass[FEATURE_TONE[feature] ?? "gray"])}>
              {t(`features.${feature}`)}
            </Badge>
          ))}
        </div>
      )}

      <KeyValue className="gap-y-1 text-[12.5px]">
        <KeyValueItem label={t("meta.runtime")}>{runtimes}</KeyValueItem>
        <KeyValueItem label={t("meta.portsAndVariables")}>
          <span className="tabular-nums">
            {blueprint.ports.length} · {blueprint.variables.length}
          </span>
        </KeyValueItem>
        <KeyValueItem label={t("meta.usedBy")}>{usedBy ? t("meta.servers", usedBy) : t("meta.unused")}</KeyValueItem>
      </KeyValue>

      <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
        <span className="flex-1 font-mono text-xs text-muted-foreground">v{blueprint.version}</span>
        {canRemove && blueprint.source === "installed" && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="hover:bg-danger/10 hover:text-danger"
            disabled={busy || usedBy > 0}
            title={usedBy > 0 ? t("inUse") : t("remove")}
            aria-label={t("remove")}
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        )}
      </div>
    </article>
  );
}
