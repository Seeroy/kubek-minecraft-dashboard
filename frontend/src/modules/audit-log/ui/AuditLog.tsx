"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Button } from "@/shared/ui/button";
import { PageLayout } from "@/shared/ui/PageLayout";
import type {
  AuditCategory,
  AuditLogQuery,
  AuditResult,
} from "@shared/types/audit.types";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuditLogsQuery } from "../api/audit-log.queries";
import { ALL, AuditLogFilters } from "./AuditLogFilters";
import { AuditLogTable } from "./AuditLogTable";

const PAGE_SIZE = 50;

export function AuditLog() {
  const { t } = useTranslation("modules.auditLog");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [result, setResult] = useState<string>(ALL);
  const [offset, setOffset] = useState(0);

  // Debounce search box
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setOffset(0);
  };
  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setOffset(0);
  };
  const handleResultChange = (value: string) => {
    setResult(value);
    setOffset(0);
  };

  const filters = useMemo<AuditLogQuery>(
    () => ({
      search: search || undefined,
      category: category === ALL ? undefined : (category as AuditCategory),
      result: result === ALL ? undefined : (result as AuditResult),
      limit: PAGE_SIZE,
      offset,
    }),
    [search, category, result, offset]
  );

  const { data, isLoading, isFetching } = useAuditLogsQuery(filters);

  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  return (
    <PageLayout className="flex h-full min-h-0 flex-col gap-4 space-y-0">
      <BlockHeader
        kicker={t("header.kicker")}
        title={t("header.title")}
        description={t("header.description")}
        icon={ScrollText}
        color="purple"
      />

      <AuditLogFilters
        search={searchInput}
        category={category}
        result={result}
        onSearchChange={handleSearchChange}
        onCategoryChange={handleCategoryChange}
        onResultChange={handleResultChange}
      />

      <AuditLogTable
        items={items}
        loading={isLoading}
        className="min-h-0 flex-1"
      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground tabular-nums">
          {t("pagination.range", from, to, total)}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={!canPrev || isFetching}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          >
            <ChevronLeft className="h-4 w-4" />
            {t("pagination.prev")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!canNext || isFetching}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
          >
            {t("pagination.next")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
