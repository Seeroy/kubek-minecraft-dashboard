"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  /** Zero based */
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  className?: string;
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

export function Pagination({ page, pageSize, total, onPage, className }: PaginationProps) {
  const { t } = useTranslation("modules.components.pagination");
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? page * pageSize + 1 : 0;
  const to = Math.min((page + 1) * pageSize, total);

  return (
    <div className={cn("flex flex-wrap items-center gap-2 border-t border-border px-4 py-2 text-[12.5px] text-muted-foreground", className)}>
      <span className="tabular-nums">{t("range", from, to, total)}</span>
      <div className="ml-auto flex items-center gap-0.5">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => onPage(page - 1)}>
          <ChevronLeft />
          {t("prev")}
        </Button>
        {pageList(page, pages).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="px-1.5">
              ...
            </span>
          ) : (
            <Button
              key={p}
              size="sm"
              variant={p === page ? "default" : "outline"}
              className="min-w-[30px] tabular-nums"
              aria-current={p === page ? "page" : undefined}
              onClick={() => onPage(p)}
            >
              {p + 1}
            </Button>
          )
        )}
        <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>
          {t("next")}
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
