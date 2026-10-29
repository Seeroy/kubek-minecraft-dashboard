"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { Panel } from "@/shared/ui/panel";
import { Plate } from "@/shared/ui/plate";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import type { Tone } from "@/shared/ui/tone";
import { BackupJournalOp, type BackupJournalEntry, type BackupStorage } from "@shared/types/backup.types";
import { Archive, CloudDownload, CloudUpload, History, type LucideIcon, RotateCcw, Scissors, Trash2, TriangleAlert } from "lucide-react";
import { useBackupJournal, useBackupStorages } from "../api/backups.queries";
import { dateParts } from "../lib/look";

const OP_LOOK: Record<BackupJournalOp, { icon: LucideIcon; tone: Tone }> = {
  [BackupJournalOp.CREATE]: { icon: Archive, tone: "cyan" },
  [BackupJournalOp.UPLOAD]: { icon: CloudUpload, tone: "blue" },
  [BackupJournalOp.DOWNLOAD]: { icon: CloudDownload, tone: "blue" },
  [BackupJournalOp.RESTORE]: { icon: RotateCcw, tone: "amber" },
  [BackupJournalOp.DELETE]: { icon: Trash2, tone: "red" },
  [BackupJournalOp.PRUNE]: { icon: Scissors, tone: "gray" },
  [BackupJournalOp.RECOVER]: { icon: TriangleAlert, tone: "orange" },
};

export function BackupJournal({ serverId }: { serverId: string }) {
  const { t } = useTranslation("modules.backups.journal");
  const journal = useBackupJournal(serverId);
  const storages = useBackupStorages().data ?? [];

  if (journal.isPending) return <Skeleton className="h-80 rounded-lg" />;
  const entries = journal.data?.pages.flat() ?? [];

  if (entries.length === 0) {
    return (
      <Empty className="rounded-lg border border-border bg-card py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <History />
          </EmptyMedia>
          <EmptyTitle>{t("empty.title")}</EmptyTitle>
          <EmptyDescription>{t("empty.description")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Panel>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-32">{t("headers.time")}</TableHead>
            <TableHead>{t("headers.operation")}</TableHead>
            <TableHead className="hidden w-40 @3xl/table:table-cell">{t("headers.location")}</TableHead>
            <TableHead className="hidden w-36 @2xl/table:table-cell">{t("headers.by")}</TableHead>
            <TableHead className="w-28 text-right">{t("headers.result")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <JournalRow key={entry.id} entry={entry} storages={storages} />
          ))}
        </TableBody>
      </Table>
      {journal.hasNextPage && (
        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" className="w-full" disabled={journal.isFetchingNextPage} onClick={() => void journal.fetchNextPage()}>
            {t("loadMore")}
          </Button>
        </div>
      )}
    </Panel>
  );
}

function JournalRow({ entry, storages }: { entry: BackupJournalEntry; storages: BackupStorage[] }) {
  const { t } = useTranslation("modules.backups.journal");
  const { icon: Icon, tone } = OP_LOOK[entry.op];
  const [date, time] = dateParts(entry.createdAt);
  const failed = entry.status === "failed";
  const location = entry.storageId ? (storages.find((s) => s.id === entry.storageId)?.name ?? "?") : t("local");
  const by =
    entry.trigger === "user" ? (entry.username ?? t("triggers.unknownUser")) : t(`triggers.${entry.trigger}`) + (entry.username ? `, ${entry.username}` : "");
  const details = [entry.bytes ? formatBytes(entry.bytes) : null, entry.durationMs ? `${(entry.durationMs / 1000).toFixed(1)} s` : null]
    .filter(Boolean)
    .join(", ");

  return (
    <TableRow data-failed={failed || undefined} className="h-[58px] data-failed:bg-danger/[0.04]">
      <TableCell className="text-muted-foreground tabular-nums">
        <div className="grid leading-tight">
          <span>{date}</span>
          <span className="text-[11.5px] opacity-75">{time}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <Plate tone={tone} size="sm">
            <Icon />
          </Plate>
          <div className="min-w-0">
            <b className="block truncate font-semibold">
              {t(`ops.${entry.op}`)}
              {entry.backupName && <span className="font-normal text-muted-foreground"> · {entry.backupName}</span>}
            </b>
            <span className="block truncate text-xs text-muted-foreground" title={entry.message ?? undefined}>
              {failed ? entry.message : details}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden truncate text-muted-foreground @3xl/table:table-cell">{location}</TableCell>
      <TableCell className="hidden truncate text-muted-foreground @2xl/table:table-cell">{by}</TableCell>
      <TableCell className="text-right">
        <Badge variant={failed ? "destructive" : "success"}>{failed ? t("failed") : t("success")}</Badge>
      </TableCell>
    </TableRow>
  );
}
