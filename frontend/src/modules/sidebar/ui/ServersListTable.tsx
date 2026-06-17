"use client";
import type { Server, ServerStatusData } from "@/modules/server";
import type { CreationStatusView } from "@/modules/server/modals/CreateServerModal/stages";
import type { FolderSelectionState } from "@/modules/sidebar/ui/FolderSection";
import FolderGroupRow from "@/modules/sidebar/ui/serversTable/FolderGroupRow";
import ServerTableRow from "@/modules/sidebar/ui/serversTable/ServerTableRow";
import { useServersTableColumns } from "@/modules/sidebar/ui/serversTable/columns";
import { useTranslation } from "@/shared/hooks/useTranslation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import type { IServerFolder } from "@shared/types/server/folder.types";
import {
  type Row,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import React, { Fragment, useMemo, useState } from "react";

interface Props {
  servers: Server[];
  folders: IServerFolder[] | undefined;
  isFiltered: boolean;
  creatingById: Map<string, CreationStatusView>;
  selectedServerId?: string;
  serverStatuses: Record<string, ServerStatusData>;
  iconErrors: Set<string>;
  onIconError: (id: string) => void;
  onSelect: (id: string) => void;
  selectionMode: boolean;
  selectedIds: string[];
  onToggleCheck: (id: string) => void;
  onToggleGroup: (ids: string[]) => void;
  onRenameFolder: (f: IServerFolder) => void;
  onDuplicateServer: (id: string) => void;
  onRenameServer: (id: string) => void;
  onExportServer: (id: string) => void;
  onDeleteServer: (id: string) => void;
}

const ServersListTable: React.FC<Props> = ({
  servers,
  folders,
  isFiltered,
  creatingById,
  selectedServerId,
  serverStatuses,
  iconErrors,
  onIconError,
  onSelect,
  selectionMode,
  selectedIds,
  onToggleCheck,
  onToggleGroup,
  onRenameFolder,
  onDuplicateServer,
  onRenameServer,
  onExportServer,
  onDeleteServer,
}) => {
  const { t } = useTranslation("modules.sidebar.serversList");
  const [sorting, setSorting] = useState<SortingState>([]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const columns = useServersTableColumns(serverStatuses);

  const table = useReactTable({
    data: servers,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
    meta: {
      serverStatuses,
      creatingById,
      selectedServerId,
      iconErrors,
      onIconError,
      selectionMode,
      selectedIds,
      onToggleCheck,
      onDuplicate: onDuplicateServer,
      onRename: onRenameServer,
      onExport: onExportServer,
      onDelete: onDeleteServer,
    },
  });

  const columnCount = columns.length;
  const rows = table.getRowModel().rows;

  const renderServerRow = (row: Row<Server>) => {
    const isCreating = creatingById.has(row.original.id);
    const isSelected = !selectionMode && selectedServerId === row.original.id;
    const isChecked = selectedSet.has(row.original.id);
    return (
      <ServerTableRow
        key={row.id}
        row={row}
        isCreating={isCreating}
        selected={!isCreating && (isSelected || (selectionMode && isChecked))}
        selectionMode={selectionMode}
        onSelect={onSelect}
        onToggleCheck={onToggleCheck}
      />
    );
  };

  // Group the rows under folder headers; flatten while searching
  const body = useMemo(() => {
    if (rows.length === 0) {
      return (
        <TableRow>
          <TableCell
            colSpan={columnCount}
            className="py-10 text-center text-muted-foreground"
          >
            {t("notFound")}
          </TableCell>
        </TableRow>
      );
    }

    if (isFiltered) return rows.map(renderServerRow);

    const buckets = new Map<string | null, Row<Server>[]>();
    for (const row of rows) {
      const fid = (row.original.folderId ?? null) as string | null;
      if (!buckets.has(fid)) buckets.set(fid, []);
      buckets.get(fid)!.push(row);
    }

    const sortedFolders = (folders ?? [])
      .slice()
      .sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
      );

    const sections: { folder: IServerFolder | null; rows: Row<Server>[] }[] = [
      ...sortedFolders.map((f) => ({
        folder: f,
        rows: buckets.get(f.id) ?? [],
      })),
      { folder: null, rows: buckets.get(null) ?? [] },
    ];

    return sections
      .filter((s) => s.folder !== null || s.rows.length > 0)
      .map((section) => {
        const ids = section.rows.map((r) => r.original.id);
        const hit = ids.filter((id) => selectedSet.has(id)).length;
        const selectionState: FolderSelectionState =
          ids.length === 0 || hit === 0
            ? "none"
            : hit === ids.length
              ? "all"
              : "some";
        return (
          <Fragment key={section.folder?.id ?? "__no_folder__"}>
            <FolderGroupRow
              folder={section.folder}
              count={section.rows.length}
              colSpan={columnCount}
              selectionMode={selectionMode}
              selectionState={selectionState}
              onToggleSelectAll={() => onToggleGroup(ids)}
              onRenameFolder={onRenameFolder}
            />
            {section.rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="py-3 text-center text-xs text-muted-foreground italic"
                >
                  {t("folders.empty")}
                </TableCell>
              </TableRow>
            ) : (
              section.rows.map(renderServerRow)
            )}
          </Fragment>
        );
      });
  }, [
    rows,
    isFiltered,
    folders,
    columnCount,
    creatingById,
    selectionMode,
    selectedSet,
    selectedServerId,
    onToggleGroup,
    onRenameFolder,
    onSelect,
    onToggleCheck,
    t,
  ]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead key={header.id}>
                    {canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 transition-colors select-none hover:text-foreground"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {sorted === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : sorted === "desc" ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>{body}</TableBody>
      </Table>
    </div>
  );
};

export default ServersListTable;
