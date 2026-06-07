"use client";

import type { ContentKind } from "@/api";
import { Server } from "@/modules/server";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAvailableContentInfinite } from "@/shared/queries";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import type { ModrinthSearchHit } from "@shared/types/plugins";
import { Loader2, Search, Settings } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getContentKind } from "../content-kind";
import { CatalogCard } from "./CatalogCard";

const PAGE_SIZE = 12;

interface AvailablePluginsTabProps {
  kind?: ContentKind;
  selectedServer: Server | null;
  onInstall: (projectId: string, initialVersionId?: string) => void;
}

export const AvailablePluginsTab = ({
  kind = "plugin",
  selectedServer,
  onInstall,
}: AvailablePluginsTabProps) => {
  const config = getContentKind(kind);
  const blueprint = useBlueprint(selectedServer?.blueprintId);
  const { t } = useTranslation(`${config.i18nNs}.availableTab`);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery.trim(), 350);

  const lastItemRef = useRef<HTMLDivElement | null>(null);

  const gameVersion = selectedServer?.variables?.GAME_VERSION;
  const pluginsQuery = useAvailableContentInfinite(kind, {
    query: debouncedQuery,
    pageSize: PAGE_SIZE,
    gameVersion: gameVersion != null ? String(gameVersion) : undefined,
    loader: config.searchLoader(blueprint),
  });

  const hits = useMemo<ModrinthSearchHit[]>(
    () => pluginsQuery.data?.pages.flatMap((p) => p.hits) ?? [],
    [pluginsQuery.data]
  );
  const totalHits = pluginsQuery.data?.pages.at(-1)?.total_hits ?? 0;
  const isInitialLoading = pluginsQuery.isLoading;
  const isLoadingMore = pluginsQuery.isFetchingNextPage;
  const hasMore = pluginsQuery.hasNextPage;

  useEffect(() => {
    if (!lastItemRef.current || !hasMore || isLoadingMore || isInitialLoading)
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          pluginsQuery.fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(lastItemRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isInitialLoading, pluginsQuery]);

  return (
    <Card>
      <CardHeader>
        <BlockHeader
          kicker={t("kicker")}
          title={t("title")}
          description={t("description")}
          icon={Settings}
          color="green"
        />
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("inputPlaceholder")}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {totalHits > 0
              ? t("summary.projectsFound", totalHits)
              : t("summary.none")}
          </span>
          <span>{t("summary.showing", hits.length)}</span>
        </div>
        <div className="space-y-3">
          {isInitialLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("loading.searching")}
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {hits.map((hit, index) => (
                  <CatalogCard
                    key={hit.project_id}
                    ref={index === hits.length - 1 ? lastItemRef : undefined}
                    hit={hit}
                    onInstall={() =>
                      onInstall(hit.project_id, hit.latest_version)
                    }
                    disabled={!selectedServer}
                  />
                ))}
              </div>
              {isLoadingMore && (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("loading.more")}
                </div>
              )}
              {!hasMore && hits.length > 0 && (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  {t("loading.end")}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
