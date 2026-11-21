"use client";

import { BlockedNotice } from "@/modules/catalog";
import { useNotifications } from "@/modules/notifications";
import { type CatalogLayout, useCatalogView } from "@/modules/plugins/hooks/useCatalogView";
import { useRouteTab } from "@/shared/hooks/useRouteTab";
import { useServerStore } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { confirmDialog } from "@/shared/modals";
import { useAuthStore } from "@/shared/stores/auth-store";
import type { BlueprintSummary } from "@/shared/types/server-types.types";
import { Button } from "@/shared/ui/button";
import { DataReveal } from "@/shared/ui/data-reveal";
import { FileDropZone } from "@/shared/ui/file-drop-zone";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { PageHeader } from "@/shared/ui/page-header";
import { Plate } from "@/shared/ui/plate";
import { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { AccessArea } from "@shared/access/areas";
import { Boxes, LayoutGrid, List, PackageSearch, RotateCw, Search, Shield, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import {
  useBlueprints,
  useBlueprintsCatalog,
  useInstallBlueprintMutation,
  useRefreshBlueprintsCatalogMutation,
  useRemoveBlueprintMutation,
} from "../api/server-types.queries";
import { SAMPLE_BLUEPRINTS } from "../data/samples";
import { gameTitle, groupByGame } from "../lib/blueprint";
import { BlueprintCard } from "./BlueprintCard";
import { GameGroupHeader } from "./GameGroupHeader";
import { SERVER_TYPE_TABS, type ServerTypeTab } from "../lib/tabs";
import { ServerTypesCatalog } from "./ServerTypesCatalog";

type Filter = "all" | BlueprintSummary["source"];
const FILTERS: Filter[] = ["all", "bundled", "installed"];

export const ServerTypesManager = () => {
  const { t } = useTranslation("modules.serverTypes");
  const { notify } = useNotifications();
  const canManage = useAuthStore((s) => s.can(AccessArea.INTEGRATIONS, "manage"));
  // The backend lets only admins install, same as uploads
  const isAdmin = useAuthStore((s) => s.user?.isAdmin ?? false);
  const [routeTab, changeTab] = useRouteTab("/server-types", SERVER_TYPE_TABS, "installed");
  const tab: ServerTypeTab = canManage ? routeTab : "installed";
  const catalogView = useCatalogView();
  // Also feeds the blocked notice, so it loads on the installed tab too
  const catalog = useBlueprintsCatalog({ enabled: canManage });
  const refreshCatalog = useRefreshBlueprintsCatalogMutation();
  const { servers } = useServerStore();
  const blueprints = useBlueprints();
  const remove = useRemoveBlueprintMutation();
  const install = useInstallBlueprintMutation();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const all = blueprints.data ?? [];
  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const server of servers) if (server.blueprintId) counts.set(server.blueprintId, (counts.get(server.blueprintId) ?? 0) + 1);
    return counts;
  }, [servers]);
  const q = query.trim().toLowerCase();
  const shown = all.filter((bp) => (filter === "all" || bp.source === filter) && (!q || `${bp.name} ${bp.id} ${gameTitle(bp)}`.toLowerCase().includes(q)));
  const names = useMemo(
    () => new Map((blueprints.data ?? []).filter((bp) => bp.source === "installed").map((bp) => [bp.id, bp.name])),
    [blueprints.data]
  );
  const updates = catalog.data?.items.filter((item) => item.updateAvailable).length ?? 0;
  const refreshing = tab === "catalog" ? refreshCatalog.isPending || catalog.isFetching : blueprints.isFetching;
  const refresh = () => (tab === "catalog" ? refreshCatalog.mutate() : void blueprints.refetch());
  const count = (key: Filter) => (key === "all" ? all.length : all.filter((bp) => bp.source === key).length);

  const confirmRemove = async (bp: BlueprintSummary) => {
    const ok = await confirmDialog({
      title: t("confirmRemove.title", bp.name),
      description: t("confirmRemove.description"),
      confirmText: t("confirmRemove.confirm"),
      cancelText: t("confirmRemove.cancel"),
      variant: "destructive",
      icon: Trash2,
    });
    if (!ok) return;
    await remove.mutateAsync(bp.id);
    notify({ type: "success", title: t("toasts.removed", bp.name) });
  };

  return (
    <div className="stagger-enter grid gap-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        className="mb-1"
        actions={
          <Button variant="outline" disabled={refreshing} onClick={refresh}>
            <RotateCw className={refreshing ? "animate-spin" : undefined} />
            {t("refresh")}
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(value) => changeTab(value as ServerTypeTab)} className="gap-4">
        {canManage && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="installed">
                <Boxes />
                {t("tabs.installed")}
                {blueprints.data && <TabsCount>{all.length}</TabsCount>}
              </TabsTrigger>
              <TabsTrigger value="catalog">
                <PackageSearch />
                {t("tabs.catalog")}
                {updates > 0 && <TabsCount className="bg-primary/14 text-primary">{updates}</TabsCount>}
              </TabsTrigger>
            </TabsList>
            {tab === "catalog" && (
              <ToggleGroup
                variant="segmented"
                value={[catalogView.view]}
                onValueChange={(next) => next[0] && catalogView.changeView(next[0] as CatalogLayout)}
                aria-label={t("tabs.view")}
              >
                <Toggle variant="segmented" value="cards" aria-label={t("tabs.cards")} title={t("tabs.cards")}>
                  <LayoutGrid />
                </Toggle>
                <Toggle variant="segmented" value="table" aria-label={t("tabs.table")} title={t("tabs.table")}>
                  <List />
                </Toggle>
              </ToggleGroup>
            )}
          </div>
        )}
        <TabsContent value="installed" className="grid gap-4">
          <BlockedNotice blocked={catalog.data?.blocked} installed={names} />

          <div className="tone-amber grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-lg border border-tone/25 bg-tone/9 px-4 py-3 text-[13px]">
            <Plate tone="amber">
              <Shield />
            </Plate>
            <div>
              <b className="mb-0.5 block font-semibold">{t("notice.title")}</b>
              <span className="text-muted-foreground">{t("notice.description")}</span>
            </div>
          </div>

          {canManage && (
            <FileDropZone
              icon={<Upload />}
              tone="blue"
              title={t("upload.title")}
              hint={t("upload.hint")}
              accept=".kbp,.json,.zip"
              buttonLabel={t("upload.choose")}
              busyLabel={t("upload.installing")}
              busy={install.isPending}
              onFile={(file) => install.mutate(file, { onSuccess: (result) => notify({ type: "success", title: t("toasts.installed", result.name) }) })}
            />
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ToggleGroup
              variant="segmented"
              className="max-w-full scrollbar-hide overflow-x-auto"
              value={[filter]}
              onValueChange={(next) => next[0] && setFilter(next[0] as Filter)}
            >
              {FILTERS.map((key) => (
                <Toggle key={key} variant="segmented" value={key} className="shrink-0">
                  {t(`filters.${key}`)}
                  <span className="text-[11px] text-muted-foreground tabular-nums">{count(key)}</span>
                </Toggle>
              ))}
            </ToggleGroup>
            <InputGroup className="ml-auto w-full sm:w-60">
              <InputGroupAddon>
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("filters.search")} />
            </InputGroup>
          </div>

          {!blueprints.isLoading && shown.length === 0 ? (
            <Empty className="rounded-lg border border-border bg-card">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Boxes />
                </EmptyMedia>
                <EmptyTitle>{t("empty.title")}</EmptyTitle>
                <EmptyDescription>{t("empty.description")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <DataReveal id="server-types" data={shown} loading={blueprints.isLoading} sample={SAMPLE_BLUEPRINTS}>
              {(shown) => (
                <div className="grid gap-5">
                  {groupByGame(shown).map((group) => (
                    <section key={group.game} className="grid gap-2.5">
                      <GameGroupHeader title={group.title} count={group.blueprints.length} />
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
                        {group.blueprints.map((bp) => (
                          <BlueprintCard
                            key={bp.id}
                            blueprint={bp}
                            usedBy={usage.get(bp.id) ?? 0}
                            canRemove={canManage}
                            busy={remove.isPending}
                            onRemove={() => void confirmRemove(bp)}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </DataReveal>
          )}
        </TabsContent>
        {canManage && (
          <TabsContent value="catalog">
            <ServerTypesCatalog view={catalogView.view} canInstall={isAdmin} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
