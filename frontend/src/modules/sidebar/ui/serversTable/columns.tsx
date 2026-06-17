"use client";
import type { Server, ServerStatusData } from "@/modules/server";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import type { CreationStatusView } from "@/modules/server/modals/CreateServerModal/stages";
import ServerCardMenu from "@/modules/sidebar/ui/ServerCardMenu";
import {
  STATUS_DOT_CLASS,
  STATUS_TEXT_CLASS,
  resolveStatus,
} from "@/modules/sidebar/ui/serversTable/status";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import BlobImage from "@/shared/ui/BlobImage";
import { BlueprintIcon } from "@/shared/ui/BlueprintIcon";
import { Checkbox } from "@/shared/ui/checkbox";
import { ServerStatus } from "@shared/types/server/server.types";
import { type ColumnDef, type RowData } from "@tanstack/react-table";
import { Server as ServerIcon } from "lucide-react";
import React, { useMemo } from "react";

// Per-table data shared with cells, avoids rebuilding columns on every change
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    serverStatuses: Record<string, ServerStatusData>;
    creatingById: Map<string, CreationStatusView>;
    selectedServerId?: string;
    iconErrors: Set<string>;
    onIconError: (id: string) => void;
    selectionMode: boolean;
    selectedIds: string[];
    onToggleCheck: (id: string) => void;
    onDuplicate: (id: string) => void;
    onRename: (id: string) => void;
    onExport: (id: string) => void;
    onDelete: (id: string) => void;
  }
}

const TypeCell: React.FC<{ server: Server }> = ({ server }) => {
  const blueprint = useBlueprint(server.blueprintId);
  const typeLabel = blueprint?.shortName ?? blueprint?.name ?? null;
  const coreSuffix = server.blueprintId?.split(".").pop();

  if (!typeLabel) return <span className="text-muted-foreground">—</span>;

  return (
    <Badge variant="secondary" className="gap-1">
      <BlueprintIcon
        icon={blueprint?.icon}
        coreType={coreSuffix}
        label={typeLabel}
        className="size-3.5"
      />
      {typeLabel}
    </Badge>
  );
};

/** Column definitions for the servers table */
export function useServersTableColumns(
  serverStatuses: Record<string, ServerStatusData>
): ColumnDef<Server>[] {
  const { t } = useTranslation("modules.sidebar.serversList");

  return useMemo<ColumnDef<Server>[]>(() => {
    return [
      {
        id: "server",
        header: t("table.server"),
        accessorFn: (row) => row.name,
        cell: ({ row, table }) => {
          const server = row.original;
          const meta = table.options.meta!;
          const coreSuffix = server.blueprintId?.split(".").pop();
          const creating = meta.creatingById.has(server.id);
          return (
            <div className="flex min-w-0 items-center gap-3">
              {meta.selectionMode && !creating && (
                <Checkbox
                  checked={meta.selectedIds.includes(server.id)}
                  onCheckedChange={() => meta.onToggleCheck(server.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={server.name}
                />
              )}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                {!meta.iconErrors.has(server.id) ? (
                  <BlobImage
                    src={`servers/${server.id}/icon`}
                    alt={server.name}
                    className="h-full w-full object-cover"
                    onError={() => meta.onIconError(server.id)}
                  />
                ) : (
                  <ServerIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {server.name}
                </span>
                {coreSuffix && (
                  <span className="truncate text-xs text-muted-foreground">
                    {coreSuffix}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: "status",
        header: t("table.status"),
        accessorFn: (row) => resolveStatus(row, serverStatuses),
        cell: ({ row, table }) => {
          const meta = table.options.meta!;
          const creating = meta.creatingById.get(row.original.id);
          if (creating != null) {
            return (
              <div className="flex min-w-40 flex-col gap-1">
                <span className="truncate text-xs font-medium text-primary">
                  {creating.message}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                      style={{ width: `${creating.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">
                    {creating.progress}%
                  </span>
                </div>
              </div>
            );
          }
          const status = resolveStatus(row.original, meta.serverStatuses);
          return (
            <span className="inline-flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  STATUS_DOT_CLASS[status] || "bg-muted"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium",
                  STATUS_TEXT_CLASS[status] || "text-muted-foreground"
                )}
              >
                {t(`status.${status}`, status)}
              </span>
            </span>
          );
        },
      },
      {
        id: "type",
        header: t("table.type"),
        enableSorting: false,
        cell: ({ row }) => <TypeCell server={row.original} />,
      },
      {
        id: "version",
        header: t("table.version"),
        accessorFn: (row) => row.variables?.GAME_VERSION ?? "",
        cell: ({ row }) => {
          const version = row.original.variables?.GAME_VERSION;
          return version != null ? (
            <span className="text-sm tabular-nums">{String(version)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        id: "players",
        header: t("table.players"),
        accessorFn: (row) => {
          const s = serverStatuses[row.id];
          return s?.players?.online ?? s?.runtime?.playersOnline ?? -1;
        },
        cell: ({ row, table }) => {
          const status = table.options.meta!.serverStatuses[row.original.id];
          const isRunning =
            resolveStatus(row.original, table.options.meta!.serverStatuses) ===
            ServerStatus.RUNNING;
          const online =
            status?.players?.online ?? status?.runtime?.playersOnline;
          const max = status?.players?.max;
          if (!isRunning || typeof online !== "number") {
            return <span className="text-muted-foreground">—</span>;
          }
          return (
            <span className="text-sm tabular-nums">
              {typeof max === "number" && max > 0
                ? `${online} / ${max}`
                : online}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row, table }) => {
          const meta = table.options.meta!;
          if (meta.selectionMode || meta.creatingById.has(row.original.id))
            return null;
          return (
            <div className="flex justify-end">
              <ServerCardMenu
                serverId={row.original.id}
                currentFolderId={row.original.folderId}
                onDuplicate={meta.onDuplicate}
                onRename={meta.onRename}
                onExport={meta.onExport}
                onDelete={meta.onDelete}
              />
            </div>
          );
        },
        meta: { cellClassName: "w-10" },
      },
    ];
  }, [t, serverStatuses]);
}
