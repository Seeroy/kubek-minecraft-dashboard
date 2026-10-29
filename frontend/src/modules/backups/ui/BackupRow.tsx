"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Meter } from "@/shared/ui/meter";
import { Plate } from "@/shared/ui/plate";
import { TableCell, TableRow } from "@/shared/ui/table";
import { BackupStatus, type Backup, type BackupStorage } from "@shared/types/backup.types";
import { AlertTriangle, Check, Download, RotateCcw, Trash2 } from "lucide-react";
import type { MouseEvent } from "react";
import type { BackupProgress, useBackupActions } from "../hooks/useBackups";
import { dateParts, statusBadge, typeLook } from "../lib/look";
import { BackupLocations } from "./BackupLocations";
import { BackupMoreMenu } from "./BackupMoreMenu";

interface BackupRowProps {
  backup: Backup;
  live?: BackupProgress;
  storages: BackupStorage[];
  actions: ReturnType<typeof useBackupActions>;
  onOpen: (backup: Backup) => void;
}

export function BackupRow({ backup, live, storages, actions, onOpen }: BackupRowProps) {
  const { t } = useTranslation("modules.backups");
  const { icon: Icon, tone } = typeLook[backup.type];
  const [date, time] = dateParts(backup.createdAt);
  const completed = backup.status === BackupStatus.COMPLETED;
  const creating = backup.status === BackupStatus.CREATING;

  // Row clicks open the details, the action buttons must not
  const act = (run: (backup: Backup) => void) => (event: MouseEvent) => {
    event.stopPropagation();
    run(backup);
  };

  return (
    <TableRow
      tabIndex={0}
      className="h-[58px] cursor-pointer"
      onClick={() => onOpen(backup)}
      // Enter on a button inside the row bubbles up here, only the row itself opens
      onKeyDown={(event) => event.key === "Enter" && event.target === event.currentTarget && onOpen(backup)}
    >
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <Plate tone={tone}>
            <Icon />
          </Plate>
          <div className="min-w-0">
            <span className="flex min-w-0 items-center gap-2">
              <b className="truncate font-semibold">{backup.name}</b>
              <BackupLocations backup={backup} storages={storages} />
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {backup.description || backup.format?.toUpperCase()}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden @3xl/table:table-cell">
        <Badge variant="secondary">{t(`type.${backup.type}`)}</Badge>
      </TableCell>
      <TableCell>
        {creating ? (
          <div className="grid gap-1">
            <Meter value={live?.progress ?? 0} tone="blue" aria-label={t("status.creating")} />
            <span className="truncate text-[11.5px] text-muted-foreground tabular-nums" title={live?.message}>
              {Math.round(live?.progress ?? 0)}% · {t("status.creating")}
            </span>
          </div>
        ) : (
          <Badge variant={statusBadge[backup.status]}>
            {completed ? <Check /> : backup.status === BackupStatus.FAILED ? <AlertTriangle /> : null}
            {t(`status.${backup.status}`)}
          </Badge>
        )}
      </TableCell>
      <TableCell className="hidden text-muted-foreground tabular-nums @3xl/table:table-cell">
        <div className="grid leading-tight">
          <span>{date}</span>
          <span className="text-[11.5px] opacity-75">{time}</span>
        </div>
      </TableCell>
      <TableCell className="hidden text-right text-muted-foreground tabular-nums @2xl/table:table-cell">
        {backup.totalSize ? formatBytes(backup.totalSize) : "—"}
      </TableCell>
      <TableCell className="hidden text-right text-muted-foreground tabular-nums @4xl/table:table-cell">
        {backup.fileCount ? backup.fileCount.toLocaleString() : "—"}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-c-blue hover:text-c-blue"
            disabled={!completed}
            title={t("actions.download")}
            aria-label={t("actions.download")}
            onClick={act(actions.download)}
          >
            <Download />
          </Button>
          {actions.canManage && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-c-amber hover:text-c-amber"
              disabled={!completed}
              title={t("actions.restore")}
              aria-label={t("actions.restore")}
              onClick={act(actions.restore)}
            >
              <RotateCcw />
            </Button>
          )}
          {actions.canWrite && <BackupMoreMenu backup={backup} storages={storages} actions={actions} disabled={!completed} />}
          {actions.canManage && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="hover:bg-danger/10 hover:text-danger"
              disabled={creating}
              title={t("actions.delete")}
              aria-label={t("actions.delete")}
              onClick={act(actions.remove)}
            >
              <Trash2 />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
