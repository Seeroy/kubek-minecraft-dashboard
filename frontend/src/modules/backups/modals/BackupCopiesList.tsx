"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { Badge } from "@/shared/ui/badge";
import { type Backup, BackupCopyStatus } from "@shared/types/backup.types";
import { Cloud, HardDrive } from "lucide-react";
import { useBackupStorages } from "../api/backups.queries";

const BADGE = {
  [BackupCopyStatus.READY]: "success",
  [BackupCopyStatus.UPLOADING]: "info",
  [BackupCopyStatus.FAILED]: "destructive",
} as const;

export function BackupCopiesList({ backup }: { backup: Backup }) {
  const { t } = useTranslation("modules.backups.locations");
  const storages = useBackupStorages().data ?? [];

  return (
    <ul className="grid gap-1.5">
      {backup.copies.map((copy) => {
        const Icon = copy.storageId ? Cloud : HardDrive;
        const where = copy.storageId ? (storages.find((s) => s.id === copy.storageId)?.name ?? t("unknownStorage")) : t("local");
        return (
          <li key={copy.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-[13px]">
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{where}</span>
            {copy.size > 0 && <span className="num text-muted-foreground">{formatBytes(copy.size)}</span>}
            <Badge variant={BADGE[copy.status]} title={copy.error ?? undefined}>
              {copy.status === BackupCopyStatus.FAILED ? t("failedShort") : t(copy.status)}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
