"use client";
import type { CatalogLayout } from "@/modules/plugins/hooks/useCatalogView";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatRelative } from "@/shared/lib/formatRelative";
import { DataReveal } from "@/shared/ui/data-reveal";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { LoadError } from "@/shared/ui/load-error";
import { Panel } from "@/shared/ui/panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import type { CatalogResponse } from "@shared/types/catalog.types";
import { CloudOff, GitPullRequest, Search, SearchX, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  CATALOG_FILTERS,
  CATALOG_SORTS,
  type CatalogEntry,
  type CatalogFilter,
  type CatalogMark,
  type CatalogSort,
  matchesFilter,
  sortItems,
} from "../lib/catalog";
import { CatalogItemCard } from "./CatalogItemCard";
import { CatalogItemDialog } from "./CatalogItemDialog";
import { CatalogItemRow } from "./CatalogItemRow";
import { CommunityInstallDialog } from "./CommunityInstallDialog";

interface CatalogQuery<T> {
  data: CatalogResponse<T> | undefined;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => unknown;
}

interface CatalogBrowserProps<T extends CatalogEntry> {
  /** Remembers the skeleton shape, unique per section */
  id: string;
  query: CatalogQuery<T>;
  view: CatalogLayout;
  icon: LucideIcon;
  /** Catalog repo, owner/name, for the "add yours" link */
  repo: string;
  sample: CatalogResponse<T>;
  marks: (item: T) => CatalogMark[];
  searchText: (item: T) => string;
  /** Kind-specific sections of the details dialog */
  details?: (item: T) => ReactNode;
  /** Missing when the user may not install */
  install?: (item: T) => Promise<unknown>;
}

export function CatalogBrowser<T extends CatalogEntry>({ id, query, view, icon: Icon, repo, sample, marks, searchText, details, install }: CatalogBrowserProps<T>) {
  const { t } = useTranslation("modules.catalog");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CatalogFilter>("all");
  const [sort, setSort] = useState<CatalogSort>("name");
  const [installing, setInstalling] = useState<Set<string>>(() => new Set());
  const [confirming, setConfirming] = useState<T | null>(null);
  // By id, so the dialog follows the install state after a refetch
  const [viewingId, setViewingId] = useState<string | null>(null);

  const all = query.data?.items ?? [];
  const viewing = all.find((item) => item.id === viewingId) ?? null;
  const q = search.trim().toLowerCase();
  const shown = sortItems(
    all.filter((item) => matchesFilter(item, filter) && (!q || `${item.name} ${item.id} ${item.author} ${item.description} ${searchText(item)}`.toLowerCase().includes(q))),
    sort
  );
  const count = (key: CatalogFilter) => all.filter((item) => matchesFilter(item, key)).length;
  const filters = CATALOG_FILTERS.filter((key) => key !== "updates" || count(key) > 0);

  const run = async (item: T) => {
    if (!install) return;
    setInstalling((prev) => new Set(prev).add(item.id));
    try {
      await install(item);
    } catch {
      // the mutation already showed the error toast
    } finally {
      setInstalling((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };
  const onInstall = (item: T) => (item.source === "community" ? setConfirming(item) : void run(item));

  const meta = query.data;
  const fetched = meta ? formatRelative(meta.fetchedAt, t("justNow")) : null;

  if (query.isError && !query.data)
    return (
      <LoadError
        title={t("error.title")}
        description={t("error.description")}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );

  return (
    <div className="grid gap-4 max-md:grid-cols-[minmax(0,1fr)]">
      {meta?.stale && (
        <div className="tone-amber flex items-center gap-2.5 rounded-lg border border-tone/25 bg-tone/9 px-4 py-2.5 text-[13px]">
          <CloudOff className="size-4 shrink-0 text-tone" />
          <span className="text-muted-foreground">{t("stale", fetched ?? "")}</span>
        </div>
      )}

      <Panel>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2">
          <InputGroup className="min-w-56 flex-1 max-sm:min-w-0 max-sm:basis-full">
            <InputGroupAddon>
              <Search className="size-3.5" />
            </InputGroupAddon>
            <InputGroupInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search")} />
          </InputGroup>
          <Select value={sort} onValueChange={(value) => value && setSort(value as CatalogSort)}>
            <SelectTrigger className="w-48 max-sm:w-full" aria-label={t("sort.label")}>
              <SelectValue>{(value: CatalogSort) => t(`sort.${value}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CATALOG_SORTS.map((key) => (
                <SelectItem key={key} value={key}>
                  {t(`sort.${key}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
          <ToggleGroup
            variant="segmented"
            className="max-w-full scrollbar-hide overflow-x-auto"
            value={[filter]}
            onValueChange={(next) => next[0] && setFilter(next[0] as CatalogFilter)}
          >
            {filters.map((key) => (
              <Toggle key={key} variant="segmented" value={key} className="shrink-0">
                {t(`filters.${key}`)}
                <span className={key === "updates" ? "text-[11px] text-primary tabular-nums" : "text-[11px] text-muted-foreground tabular-nums"}>{count(key)}</span>
              </Toggle>
            ))}
          </ToggleGroup>
          {fetched && !meta?.stale && <span className="ml-auto text-xs text-muted-foreground">{t("fetched", fetched)}</span>}
        </div>
      </Panel>

      {!query.isLoading && shown.length === 0 ? (
        <Empty className="rounded-lg border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">{all.length ? <SearchX /> : <Icon />}</EmptyMedia>
            <EmptyTitle>{all.length ? t("empty.noMatches") : t("empty.title")}</EmptyTitle>
            <EmptyDescription>{all.length ? t("empty.noMatchesHint") : t("empty.description")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataReveal id={`catalog-${id}-${view}`} data={shown} loading={query.isLoading} sample={sample.items}>
          {(items) =>
            view === "table" ? (
              <Panel>
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{t("headers.name")}</TableHead>
                      <TableHead className="hidden w-36 @3xl/table:table-cell">{t("headers.author")}</TableHead>
                      <TableHead className="hidden w-36 @xl/table:table-cell">{t("headers.source")}</TableHead>
                      <TableHead className="hidden w-32 @2xl/table:table-cell">{t("headers.version")}</TableHead>
                      <TableHead className="hidden w-56 @5xl/table:table-cell">{t("headers.marks")}</TableHead>
                      <TableHead className="hidden w-32 @4xl/table:table-cell">{t("headers.updated")}</TableHead>
                      <TableHead className="w-48" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <CatalogItemRow
                        key={item.id}
                        item={item}
                        marks={marks(item)}
                        icon={Icon}
                        installing={installing.has(item.id)}
                        onInstall={install ? () => onInstall(item) : undefined}
                        onOpen={() => setViewingId(item.id)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </Panel>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
                {items.map((item) => (
                  <CatalogItemCard
                    key={item.id}
                    item={item}
                    marks={marks(item)}
                    icon={Icon}
                    installing={installing.has(item.id)}
                    onInstall={install ? () => onInstall(item) : undefined}
                    onOpen={() => setViewingId(item.id)}
                  />
                ))}
              </div>
            )
          }
        </DataReveal>
      )}

      <a
        href={`https://github.com/${repo}#readme`}
        target="_blank"
        rel="noreferrer"
        className="mx-auto inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground"
      >
        <GitPullRequest className="size-3.5" />
        {t("addYours", repo)}
      </a>

      <CatalogItemDialog
        item={viewing}
        icon={Icon}
        marks={viewing ? marks(viewing) : []}
        details={viewing && details?.(viewing)}
        installing={!!viewing && installing.has(viewing.id)}
        onInstall={install && viewing ? () => onInstall(viewing) : undefined}
        onClose={() => setViewingId(null)}
      />

      <CommunityInstallDialog
        item={confirming}
        onCancel={() => setConfirming(null)}
        onConfirm={(item) => {
          setConfirming(null);
          void run(item as T);
        }}
      />
    </div>
  );
}
