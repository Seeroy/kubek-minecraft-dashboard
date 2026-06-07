"use client";
import type { AuditLogEntry as IAuditLog } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  type ColumnDef,
  type RowData,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import {
  actionLabelKey,
  formatTimestamp,
  humanizeAction,
  resultBadgeVariant,
} from "../lib/format";

// Per-column cell styling, applied to every body cell of that column
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    cellClassName?: string;
  }
}

interface AuditLogTableProps {
  items: IAuditLog[];
  loading: boolean;
  className?: string;
}

export function AuditLogTable({
  items,
  loading,
  className,
}: AuditLogTableProps) {
  const { t } = useTranslation("modules.auditLog");
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<IAuditLog>[]>(() => {
    // Use the dedicated action label when present, else humanize the raw action
    const actionLabel = (action: string) => {
      const label = t(`actions.${actionLabelKey(action)}`);
      return label.startsWith("NOT TRANSLATED")
        ? humanizeAction(action)
        : label;
    };

    return [
      {
        id: "time",
        header: t("table.time"),
        accessorFn: (row) => row.createdAt,
        cell: ({ row }) => formatTimestamp(row.original.createdAt),
        meta: { cellClassName: "text-muted-foreground tabular-nums" },
      },
      {
        id: "user",
        header: t("table.user"),
        accessorFn: (row) => row.username,
        cell: ({ row }) => (
          <>
            {row.original.username}
            {row.original.source !== "panel" && (
              <Badge
                variant="outline"
                className="ml-1.5 h-[18px] px-1.5 text-[10px]"
              >
                {t(`sources.${row.original.source}`)}
              </Badge>
            )}
          </>
        ),
        meta: { cellClassName: "font-medium" },
      },
      {
        id: "action",
        header: t("table.action"),
        accessorFn: (row) => actionLabel(row.action),
      },
      {
        id: "category",
        header: t("table.category"),
        accessorFn: (row) => t(`categories.${row.category}`),
        cell: ({ row }) => (
          <Badge variant="secondary" className="h-[18px] px-1.5 text-[10px]">
            {t(`categories.${row.original.category}`)}
          </Badge>
        ),
      },
      {
        id: "resource",
        header: t("table.resource"),
        accessorFn: (row) => row.resourceName || row.resourceId || "",
        cell: ({ row }) =>
          row.original.resourceName || row.original.resourceId || "-",
        meta: { cellClassName: "max-w-[18rem] truncate text-muted-foreground" },
      },
      {
        id: "result",
        header: t("table.result"),
        accessorFn: (row) => t(`results.${row.result}`),
        cell: ({ row }) => (
          <Badge
            variant={resultBadgeVariant(row.original.result)}
            className="h-[18px] px-1.5 text-[10px]"
          >
            {t(`results.${row.original.result}`)}
          </Badge>
        ),
      },
      {
        id: "ip",
        header: t("table.ip"),
        accessorFn: (row) => row.ip || "",
        cell: ({ row }) => row.original.ip || "-",
        meta: { cellClassName: "text-muted-foreground tabular-nums" },
      },
    ];
  }, [t]);

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const columnCount = columns.length;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/95 shadow-sm",
        className
      )}
    >
      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id}>
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
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {Array.from({ length: columnCount }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="py-10 text-center text-muted-foreground"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(cell.column.columnDef.meta?.cellClassName)}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
