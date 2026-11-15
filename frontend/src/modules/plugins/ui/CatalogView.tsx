"use client";

import type { ContentKind, ContentSortIndex } from "@/api";
import type { Server } from "@/modules/server";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAccess } from "@/shared/lib/access";
import { cn } from "@/shared/lib/cn";
import { useAvailableContentInfinite } from "@/shared/queries";
import { Button } from "@/shared/ui/button";
import { DataReveal } from "@/shared/ui/data-reveal";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { Panel } from "@/shared/ui/panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Spinner } from "@/shared/ui/spinner";
import { Switch } from "@/shared/ui/switch";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { toneClass } from "@/shared/ui/tone";
import { AccessArea } from "@shared/access/areas";
import type { InstalledPluginView, ModrinthSearchHit } from "@shared/types/plugins";
import { ArrowDown, Download, Search, SearchX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getContentKind } from "../content-kind";
import { SAMPLE_CATALOG } from "../data/samples";
import type { CatalogLayout } from "../hooks/useCatalogView";
import { useQuickInstall } from "../hooks/useQuickInstall";
import { CATALOG_CATEGORIES, categoryTone } from "../lib/categories";
import { BULK_INSTALL_MODAL_ID } from "../modals/BulkInstallModal";
import { INSTALL_PLUGIN_MODAL_ID } from "../modals/InstallPluginModal";
import { isHitCompatible } from "../utils/pickVersion";
import { CatalogCard } from "./CatalogCard";
import { CatalogRow } from "./CatalogRow";

const PAGE_SIZE = 12;
const SORTS: ContentSortIndex[] = ["relevance", "downloads", "follows", "newest", "updated"];
const ALL = "all";
// start loading the next page a bit before the user hits the bottom
const PRELOAD_MARGIN = "400px";

interface CatalogViewProps {
  kind: ContentKind;
  server: Server;
  installed: InstalledPluginView[] | undefined;
  view: CatalogLayout;
}

export function CatalogView({ kind, server, installed, view }: CatalogViewProps) {
  const config = getContentKind(kind);
  const { t } = useTranslation(config.i18nNs);
  const { t: tc } = useTranslation("modules.content");
  const { openModal } = useModal();
  const blueprint = useBlueprint(server.blueprintId);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [sort, setSort] = useState<ContentSortIndex>("relevance");
  const [showIncompatible, setShowIncompatible] = useState(false);
  // Kept across searches so a few lookups can add up to one batch
  const [selection, setSelection] = useState<Map<string, ModrinthSearchHit>>(() => new Map());
  const debouncedQuery = useDebouncedValue(query.trim(), 350);

  const gameVersion = server.variables?.GAME_VERSION != null ? String(server.variables.GAME_VERSION) : undefined;
  const search = useAvailableContentInfinite(kind, {
    pageSize: PAGE_SIZE,
    query: debouncedQuery,
    gameVersion: showIncompatible ? undefined : gameVersion,
    loader: config.searchLoader(blueprint),
    categories: category === ALL ? undefined : [category],
    index: sort,
  });

  const hits = useMemo(() => search.data?.pages.flatMap((page) => page.hits) ?? [], [search.data]);
  const total = search.data?.pages.at(-1)?.total_hits ?? 0;
  const installedIds = useMemo(() => new Set(installed?.map((item) => item.projectId)), [installed]);
  const coreLabel = [blueprint?.shortName ?? blueprint?.name, gameVersion].filter(Boolean).join(" ");

  const sentinelRef = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = search;

  // Recreated after each page so a sentinel that is still visible triggers the next one
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage || isFetchNextPageError) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void fetchNextPage();
      },
      { rootMargin: PRELOAD_MARGIN }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage, hits.length]);

  const canInstall = useAccess([AccessArea.CONTENT, "write"], server.id);
  const quick = useQuickInstall(kind, server);
  const openInstall = (projectId: string) => openModal(INSTALL_PLUGIN_MODAL_ID, { kind, server, projectId });

  const incompatibleWith = (hit: ModrinthSearchHit) => (isHitCompatible(hit.versions, gameVersion) ? undefined : gameVersion);
  const selectable = (hit: ModrinthSearchHit) =>
    canInstall && hit.server_side !== "unsupported" && !installedIds.has(hit.project_id) && !quick.isInstalling(hit.project_id) && !incompatibleWith(hit);
  const selected = [...selection.values()].filter(selectable);

  const toggleSelected = (hit: ModrinthSearchHit, on: boolean) =>
    setSelection((current) => {
      const next = new Map(current);
      if (on) next.set(hit.project_id, hit);
      else next.delete(hit.project_id);
      return next;
    });

  const openBulkInstall = () =>
    openModal(BULK_INSTALL_MODAL_ID, {
      kind,
      hits: selected,
      onConfirm: (projectIds) => {
        setSelection(new Map());
        void quick.installMany(projectIds);
      },
    });

  const itemProps = (hit: ModrinthSearchHit) => ({
    hit,
    kind,
    installed: installedIds.has(hit.project_id),
    installing: quick.isInstalling(hit.project_id),
    incompatibleWith: incompatibleWith(hit),
    onInstall: canInstall ? () => quick.installOne(hit.project_id) : undefined,
    onDetails: () => openInstall(hit.project_id),
    selected: selection.has(hit.project_id),
    onSelect: selectable(hit) ? (on: boolean) => toggleSelected(hit, on) : undefined,
  });

  return (
    // minmax(0) so categories don't stretch the page on mobile
    <div className="grid gap-4 max-md:grid-cols-[minmax(0,1fr)]">
      <Panel>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2">
          <InputGroup className="min-w-56 flex-1 max-sm:min-w-0 max-sm:basis-full">
            <InputGroupAddon>
              <Search className="size-3.5" />
            </InputGroupAddon>
            <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchPlaceholder")} />
          </InputGroup>
          <Select value={sort} onValueChange={(value) => value && setSort(value as ContentSortIndex)}>
            <SelectTrigger className="w-48 max-sm:w-full" aria-label={tc("catalog.sort.label")}>
              <SelectValue>{(value: ContentSortIndex) => tc(`catalog.sort.${value}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((key) => (
                <SelectItem key={key} value={key}>
                  {tc(`catalog.sort.${key}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {gameVersion && (
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-muted-foreground" title={tc("catalog.showIncompatibleHint", gameVersion)}>
              <Switch size="sm" checked={showIncompatible} onCheckedChange={setShowIncompatible} />
              {tc("catalog.showIncompatible")}
            </label>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5">
          <ToggleGroup value={[category]} onValueChange={(next) => next[0] && setCategory(next[0])} className="flex-wrap gap-1.5 max-sm:w-full max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:scrollbar-hide max-sm:*:shrink-0">
            {[ALL, ...CATALOG_CATEGORIES].map((key) => (
              <Toggle
                key={key}
                value={key}
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-full bg-transparent text-[12.5px] data-pressed:border-tone/40 data-pressed:bg-tone/12",
                  key === ALL ? toneClass.primary : toneClass[categoryTone(key)]
                )}
              >
                {key !== ALL && <i className="size-2 rounded-full bg-tone" />}
                {key === ALL ? tc("catalog.all") : tc(`categories.${key}`)}
              </Toggle>
            ))}
          </ToggleGroup>
          <span className="ml-auto text-xs text-muted-foreground">
            {total ? tc("catalog.found", total, hits.length) : tc("catalog.nothing")}
            {coreLabel && !showIncompatible && ` · ${tc("catalog.compatibleWith", coreLabel)}`}
          </span>
        </div>
      </Panel>

      {!search.isLoading && hits.length === 0 ? (
        <Empty className="rounded-lg border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>{tc("catalog.nothing")}</EmptyTitle>
            <EmptyDescription>{tc("catalog.emptyDescription", debouncedQuery)}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <DataReveal id={`content-catalog-${kind}-${view}`} data={hits} loading={search.isLoading} sample={SAMPLE_CATALOG}>
            {(hits) =>
              view === "table" ? (
                <Panel>
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>{tc("catalog.headers.name")}</TableHead>
                        <TableHead className="hidden w-36 @3xl/table:table-cell">{tc("catalog.headers.author")}</TableHead>
                        <TableHead className="hidden w-24 text-right @2xl/table:table-cell">{tc("catalog.headers.downloads")}</TableHead>
                        <TableHead className="hidden w-40 @xl/table:table-cell">{tc("catalog.headers.versions")}</TableHead>
                        <TableHead className="hidden w-32 @4xl/table:table-cell">{tc("catalog.headers.updated")}</TableHead>
                        <TableHead className="w-40" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hits.map((hit) => (
                        <CatalogRow key={hit.project_id} {...itemProps(hit)} />
                      ))}
                    </TableBody>
                  </Table>
                </Panel>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
                  {hits.map((hit) => (
                    <CatalogCard key={hit.project_id} {...itemProps(hit)} />
                  ))}
                </div>
              )
            }
          </DataReveal>
          {search.isLoading ? null : hasNextPage ? (
            <div ref={sentinelRef} className="flex justify-center">
              {isFetchNextPageError ? (
                <Button variant="outline" onClick={() => void fetchNextPage()}>
                  <ArrowDown />
                  {tc("catalog.showMore")}
                </Button>
              ) : (
                <Spinner className={cn(!isFetchingNextPage && "invisible")} />
              )}
            </div>
          ) : (
            <p className="text-center text-[12.5px] text-muted-foreground">{t("catalogEnd")}</p>
          )}
        </>
      )}

      {selected.length > 0 && (
        <div className="sticky bottom-4 z-20 mx-auto flex max-w-full items-center gap-2 rounded-xl border border-border bg-popover py-2 pr-2 pl-4 shadow-pop">
          <span className="text-[13px] font-medium whitespace-nowrap tabular-nums">{tc("catalog.selected", selected.length)}</span>
          <Button variant="ghost" size="sm" onClick={() => setSelection(new Map())}>
            <X />
            {tc("catalog.clearSelection")}
          </Button>
          <Button size="sm" onClick={openBulkInstall}>
            <Download />
            {tc("catalog.installSelected")}
          </Button>
        </div>
      )}
    </div>
  );
}
