"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { type Backup, type BackupCopy, BackupCopyStatus, type BackupStorage } from "@shared/types/backup.types";
import { Cloud, HardDrive, Pin } from "lucide-react";

const STATE: Record<BackupCopyStatus, string> = {
  [BackupCopyStatus.READY]: "text-muted-foreground",
  [BackupCopyStatus.UPLOADING]: "text-c-blue motion-safe:animate-blink",
  [BackupCopyStatus.FAILED]: "text-danger",
};

/** One small mark per stored copy, plus the pin */
export function BackupLocations({ backup, storages }: { backup: Backup; storages: BackupStorage[] }) {
  const { t } = useTranslation("modules.backups.locations");

  const label = (copy: BackupCopy) => {
    const where = copy.storageId ? t("remote", storages.find((s) => s.id === copy.storageId)?.name ?? t("unknownStorage")) : t("local");
    const state = copy.status === BackupCopyStatus.FAILED ? t("failed", copy.error ?? "?") : t(copy.status);
    return `${where}: ${state}`;
  };

  return (
    <span className="inline-flex items-center gap-1 [&_svg]:size-3.5">
      {backup.pinned && (
        <Tooltip>
          <TooltipTrigger render={<span className="text-c-amber" aria-label={t("pinned")} />}>
            <Pin />
          </TooltipTrigger>
          <TooltipContent>{t("pinned")}</TooltipContent>
        </Tooltip>
      )}
      {backup.copies.map((copy) => {
        const Icon = copy.storageId ? Cloud : HardDrive;
        return (
          <Tooltip key={copy.id}>
            <TooltipTrigger render={<span className={STATE[copy.status]} aria-label={label(copy)} />}>
              <Icon />
            </TooltipTrigger>
            <TooltipContent>{label(copy)}</TooltipContent>
          </Tooltip>
        );
      })}
    </span>
  );
}
