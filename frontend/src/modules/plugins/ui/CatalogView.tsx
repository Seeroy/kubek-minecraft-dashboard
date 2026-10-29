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
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { Panel } from "@/shared/ui/panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Spinner } from "@/shared/ui/spinner";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { toneClass } from "@/shared/ui/tone";
import { AccessArea } from "@shared/access/areas";
import type { InstalledPluginView } from "@shared/types/plugins";
import { ArrowDown, Search, SearchX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getContentKind } from "../content-kind";
import { CATALOG_CATEGORIES, categoryTone } from "../lib/categories";
import { INSTALL_PLUGIN_MODAL_ID } from "../modals/InstallPluginModal";
import { CatalogCard } from "./CatalogCard";

const PAGE_SIZE = 12;
const SORTS: ContentSortIndex[] = ["relevance", "downloads", "follows", "newest", "updated"];
const ALL = "all";
// start loading the next page a bit before the user hits the bottom
const PRELOAD_MARGIN = "400px";

interface CatalogViewProps {
  kind: ContentKind;
  server: Server;
  installed: InstalledPluginView[] | undefined;
}

export function CatalogView({ kind, server, installed }: CatalogViewProps) {
  const config = getContentKind(kind);
  const { t } = useTranslation(config.i18nNs);
  const { t: tc } = useTranslation("modules.content");
  const { openModal } = useModal();
  const blueprint = useBlueprint(server.blueprintId);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [sort, setSort] = useState<ContentSortIndex>("relevance");
  const debouncedQuery = useDebouncedValue(query.trim(), 350);

  const gameVersion = server.variables?.GAME_VERSION != null ? String(server.variables.GAME_VERSION) : undefined;
  const search = useAvailableContentInfinite(kind, {
    pageSize: PAGE_SIZE,
    query: debouncedQuery,
    gameVersion,
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
  const openInstall = (projectId: string, versionId?: string) =>
    openModal(INSTALL_PLUGIN_MODAL_ID, { kind, server, projectId, initialVersionId: versionId });

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
            {coreLabel && ` · ${tc("catalog.compatibleWith", coreLabel)}`}
          </span>
        </div>
      </Panel>

      {search.isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="h-52 rounded-lg" />
          ))}
        </div>
      ) : hits.length === 0 ? (
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
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
            {hits.map((hit) => (
              <CatalogCard
                key={hit.project_id}
                hit={hit}
                kind={kind}
                installed={installedIds.has(hit.project_id)}
                onInstall={canInstall ? () => openInstall(hit.project_id, hit.latest_version) : undefined}
                onDetails={() => openInstall(hit.project_id)}
              />
            ))}
          </div>
          {hasNextPage ? (
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
    </div>
  );
}
