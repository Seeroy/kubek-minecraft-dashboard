"use client";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { Panel, PanelHead } from "@/shared/ui/panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { BackupStatus, BackupType, type Backup } from "@shared/types/backup.types";
import { Archive, Plus, Search, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { useBackupStorages } from "../api/backups.queries";
import { type BackupProgress, useBackupActions } from "../hooks/useBackups";
import { BACKUP_INFO_MODAL_ID } from "../modals/BackupInfoModal";
import { BackupRow } from "./BackupRow";

const STATUS_FILTERS = ["all", BackupStatus.COMPLETED, BackupStatus.CREATING, BackupStatus.FAILED] as const;
const TYPE_FILTERS = ["all", BackupType.FULL, BackupType.PARTIAL] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];
type TypeFilter = (typeof TYPE_FILTERS)[number];

interface BackupsPanelProps {
  serverId: string;
  backups: Backup[];
  progress: Record<string, BackupProgress>;
  loading: boolean;
  /** Missing when the user may not create backups */
  onCreate?: () => void;
}

export function BackupsPanel({ serverId, backups, progress, loading, onCreate }: BackupsPanelProps) {
  const { t } = useTranslation("modules.backups");
  const storages = useBackupStorages().data ?? [];
  const { openModal } = useModal();
  const actions = useBackupActions(serverId);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const debouncedQuery = useDebouncedValue(query.trim().toLowerCase(), 200);

  const rows = useMemo(
    () =>
      backups
        .filter(
          (b) =>
            (status === "all" || b.status === status) &&
            (type === "all" || b.type === type) &&
            (!debouncedQuery || `${b.name} ${b.description ?? ""}`.toLowerCase().includes(debouncedQuery))
        )
        .sort((a, b) => b.createdAt - a.createdAt),
    [backups, status, type, debouncedQuery]
  );

  const openInfo = (backup: Backup) => openModal(BACKUP_INFO_MODAL_ID, { backup, actions });

  if (loading) return <Skeleton className="h-80 rounded-lg" />;

  if (backups.length === 0) {
    return (
      <Empty className="rounded-lg border border-border bg-card py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Archive />
          </EmptyMedia>
          <EmptyTitle>{t("empty.title")}</EmptyTitle>
          <EmptyDescription>{t("empty.description")}</EmptyDescription>
        </EmptyHeader>
        {onCreate && (
          <EmptyContent>
            <Button onClick={onCreate}>
              <Plus />
              {t("create")}
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );
  }

  return (
    <Panel>
      <PanelHead className="flex-wrap gap-2 py-2">
        <InputGroup className="w-full sm:max-w-80 sm:flex-1">
          <InputGroupAddon>
            <Search className="size-3.5" />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("filters.search")} />
        </InputGroup>
        <ToggleGroup variant="segmented" value={[status]} onValueChange={(next) => next[0] && setStatus(next[0] as StatusFilter)}>
          {STATUS_FILTERS.map((key) => (
            <Toggle key={key} variant="segmented" value={key}>
              {t(`filters.status.${key}`)}
            </Toggle>
          ))}
        </ToggleGroup>
        <Select<TypeFilter> value={type} onValueChange={(value) => value && setType(value)}>
          <SelectTrigger className="ml-auto w-40" aria-label={t("filters.type.label")}>
            <SelectValue>{(value: TypeFilter) => (value === "all" ? t("filters.type.all") : t(`type.${value}`))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTERS.map((key) => (
              <SelectItem key={key} value={key}>
                {key === "all" ? t("filters.type.all") : t(`type.${key}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PanelHead>

      {rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>{t("noMatches.title")}</EmptyTitle>
            <EmptyDescription>{t("noMatches.description")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("headers.name")}</TableHead>
              <TableHead className="hidden w-28 @3xl/table:table-cell">{t("headers.type")}</TableHead>
              <TableHead className="w-40">{t("headers.status")}</TableHead>
              <TableHead className="hidden w-32 @3xl/table:table-cell">{t("headers.created")}</TableHead>
              <TableHead className="hidden w-24 text-right @2xl/table:table-cell">{t("headers.size")}</TableHead>
              <TableHead className="hidden w-20 text-right @4xl/table:table-cell">{t("headers.files")}</TableHead>
              <TableHead className="w-36" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((backup) => (
              <BackupRow key={backup.id} backup={backup} live={progress[backup.id]} storages={storages} actions={actions} onOpen={openInfo} />
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
