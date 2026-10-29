"use client";
import type { AuditLogEntry } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { Plate } from "@/shared/ui/plate";
import { PlayerHead } from "@/shared/ui/player-head";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { AuditResult } from "@shared/types/audit.types";
import { ChevronLeft, ChevronRight, Cpu, ScrollText } from "lucide-react";
import { Fragment, useLayoutEffect, useRef, useState } from "react";
import { formatEntryTime, useActionLabel } from "../lib/format";
import { actionLook } from "../lib/look";
import { AuditDetails } from "./AuditDetails";
import { AuditTarget } from "./AuditTarget";

interface AuditTableProps {
  items: AuditLogEntry[];
  total: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPage: (page: number) => void;
}

// First, last and the neighbours of the current page, gaps become an ellipsis
function pageList(current: number, count: number): (number | null)[] {
  const pages: (number | null)[] = [];
  for (let p = 0; p < count; p++) {
    if (p === 0 || p === count - 1 || Math.abs(p - current) <= 1) pages.push(p);
    else if (pages.at(-1) !== null) pages.push(null);
  }
  return pages;
}

function Who({ entry }: { entry: AuditLogEntry }) {
  const { t } = useTranslation("modules.auditLog.sources");
  if (entry.source === "system") {
    return (
      <span className="flex min-w-0 items-center gap-2">
        <Plate tone="gray" size="sm" className="size-[22px]">
          <Cpu />
        </Plate>
        <span className="truncate">{t("system")}</span>
      </span>
    );
  }
  return (
    <span className="flex min-w-0 items-center gap-2">
      <PlayerHead name={entry.skinName || entry.username} size={22} className="size-[22px] shrink-0 rounded-[5px]" />
      <span className="truncate">{entry.username}</span>
      {entry.source === "telegram" && <Badge variant="info">TG</Badge>}
      {entry.source === "assistant" && <Badge variant="info">AI</Badge>}
    </span>
  );
}

const COLUMNS = 7;

// Count only visible header cells, otherwise the details row adds empty columns
function useVisibleColumns(mounted: boolean) {
  const ref = useRef<HTMLTableRowElement>(null);
  const [count, setCount] = useState(COLUMNS);

  useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;
    const update = () => setCount([...row.cells].filter((cell) => getComputedStyle(cell).display !== "none").length || COLUMNS);
    const observer = new ResizeObserver(update);
    observer.observe(row);
    update();
    return () => observer.disconnect();
  }, [mounted]);

  return [ref, count] as const;
}

export function AuditTable({ items, total, loading, page, pageSize, onPage }: AuditTableProps) {
  const { t } = useTranslation("modules.auditLog");
  const label = useActionLabel();
  const [open, setOpen] = useState<string | null>(null);
  const [headerRow, columns] = useVisibleColumns(!loading && items.length > 0);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? page * pageSize + 1 : 0;
  const to = Math.min((page + 1) * pageSize, total);

  const goTo = (next: number) => {
    setOpen(null);
    onPage(next);
  };

  if (loading) {
    return (
      <div className="grid gap-2 p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ScrollText />
          </EmptyMedia>
          <EmptyTitle>{t("empty.title")}</EmptyTitle>
          <EmptyDescription>{t("empty.description")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow ref={headerRow} className="hover:bg-transparent">
            <TableHead className="w-10" />
            <TableHead className="hidden w-32 @2xl/table:table-cell">{t("table.time")}</TableHead>
            <TableHead className="hidden w-44 @2xl/table:table-cell">{t("table.user")}</TableHead>
            <TableHead>{t("table.action")}</TableHead>
            <TableHead className="hidden w-60 @4xl/table:table-cell">{t("table.resource")}</TableHead>
            <TableHead className="w-24">{t("table.result")}</TableHead>
            <TableHead className="hidden w-32 @4xl/table:table-cell">{t("table.ip")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((entry) => {
            const { icon: Icon, tone } = actionLook(entry.action, entry.category);
            const expanded = open === entry.id;
            const toggle = () => setOpen(expanded ? null : entry.id);
            return (
              <Fragment key={entry.id}>
                <TableRow
                  tabIndex={0}
                  aria-expanded={expanded}
                  className={cn("h-12 cursor-pointer", expanded && "bg-primary/6 hover:bg-primary/6")}
                  onClick={toggle}
                  onKeyDown={(event) => event.key === "Enter" && event.target === event.currentTarget && toggle()}
                >
                  <TableCell>
                    <ChevronRight
                      aria-label={t("table.expand")}
                      className={cn("size-4 text-muted-foreground transition-transform duration-200", expanded && "rotate-90")}
                    />
                  </TableCell>
                  <TableCell className="hidden text-[12.5px] text-muted-foreground tabular-nums @2xl/table:table-cell">
                    {formatEntryTime(entry.createdAt, (time) => t("table.today", time))}
                  </TableCell>
                  <TableCell className="hidden @2xl/table:table-cell">
                    <Who entry={entry} />
                  </TableCell>
                  <TableCell>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Plate tone={tone} size="sm">
                        <Icon />
                      </Plate>
                      <span className="grid min-w-0 leading-tight">
                        <span className="truncate font-medium">{label(entry.action)}</span>
                        {/* The object column is hidden on narrow tables */}
                        <AuditTarget entry={entry} inline className="text-[11.5px] text-muted-foreground @4xl/table:hidden" />
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="hidden @4xl/table:table-cell">
                    <AuditTarget entry={entry} className="text-[12.5px]" />
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.result === AuditResult.SUCCESS ? "success" : "destructive"}>{t(`results.${entry.result}`)}</Badge>
                  </TableCell>
                  <TableCell className="hidden truncate font-mono text-xs text-muted-foreground @4xl/table:table-cell">{entry.ip || "—"}</TableCell>
                </TableRow>
                {expanded && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={columns} className="p-0 whitespace-normal">
                      <AuditDetails entry={entry} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2 text-[12.5px] text-muted-foreground">
        <span className="tabular-nums">{t("pagination.range", from, to, total)}</span>
        <div className="ml-auto flex items-center gap-0.5">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => goTo(page - 1)}>
            <ChevronLeft />
            {t("pagination.prev")}
          </Button>
          {pageList(page, pages).map((p, i) =>
            p === null ? (
              <span key={`gap-${i}`} className="px-1.5">
                …
              </span>
            ) : (
              <Button
                key={p}
                size="sm"
                variant={p === page ? "default" : "outline"}
                className="min-w-[30px] tabular-nums"
                aria-current={p === page ? "page" : undefined}
                onClick={() => goTo(p)}
              >
                {p + 1}
              </Button>
            )
          )}
          <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => goTo(page + 1)}>
            {t("pagination.next")}
            <ChevronRight />
          </Button>
        </div>
      </div>
    </>
  );
}
