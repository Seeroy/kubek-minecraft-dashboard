"use client";

import type { ContentKind } from "@/api";
import type { Server } from "@/modules/server";
import { useNotifications } from "@/modules/notifications";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAccess } from "@/shared/lib/access";
import { useUpdateContentMutation } from "@/shared/queries";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { Panel, PanelActions, PanelFoot, PanelHead } from "@/shared/ui/panel";
import { Plate } from "@/shared/ui/plate";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { AccessArea } from "@shared/access/areas";
import type { InstalledPluginView } from "@shared/types/plugins";
import { Download, Puzzle, Search, SearchX, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { getContentKind } from "../content-kind";
import { INSTALL_PLUGIN_MODAL_ID } from "../modals/InstallPluginModal";
import { REMOVE_PLUGIN_MODAL_ID } from "../modals/RemovePluginModal";
import { displayName } from "../lib/installed";
import { InstalledRow } from "./InstalledRow";

type Filter = "all" | "updates" | "manual" | "dependencies";

const FILTERS: Record<Filter, (item: InstalledPluginView) => boolean> = {
  all: () => true,
  updates: (item) => item.hasUpdate,
  manual: (item) => item.type === "manual",
  dependencies: (item) => !!item.dependencyOf,
};

interface InstalledViewProps {
  kind: ContentKind;
  server: Server;
  items: InstalledPluginView[] | undefined;
  loading: boolean;
  onOpenCatalog: () => void;
}

export function InstalledView({ kind, server, items = [], loading, onOpenCatalog }: InstalledViewProps) {
  const config = getContentKind(kind);
  const { t } = useTranslation(config.i18nNs);
  const { t: tc } = useTranslation("modules.content.installed");
  const { openModal } = useModal();
  const { notify } = useNotifications();
  const updateMutation = useUpdateContentMutation(kind, server.id);
  const [query, setQuery] = useState("");
  const canUpdate = useAccess([AccessArea.CONTENT, "write"], server.id);
  const canRemove = useAccess([AccessArea.CONTENT, "manage"], server.id);
  const [filter, setFilter] = useState<Filter>("all");

  const updates = useMemo(() => items.filter(FILTERS.updates), [items]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (item) => FILTERS[filter](item) && (!q || `${displayName(item)} ${item.fileName}`.toLowerCase().includes(q))
    );
  }, [items, query, filter]);

  const openInstall = (item: InstalledPluginView) =>
    openModal(INSTALL_PLUGIN_MODAL_ID, {
      kind,
      server,
      projectId: item.metadata!.id,
      initialVersionId: item.latestVersion?.id ?? item.version?.id,
      record: item,
    });

  const openRemove = (item: InstalledPluginView) =>
    openModal(REMOVE_PLUGIN_MODAL_ID, { kind, serverId: server.id, item, installed: items });

  const updateAll = async () => {
    const results = await Promise.allSettled(
      updates.map((item) =>
        updateMutation.mutateAsync({ recordId: item.id, payload: { versionId: item.latestVersion!.id, dependencies: [], reinstall: true } })
      )
    );
    const scheduled = results.filter((result) => result.status === "fulfilled").length;
    if (scheduled) notify({ type: "success", title: t("install.updatesScheduled", scheduled) });
  };

  if (loading) return <Skeleton className="h-80 rounded-lg" />;

  if (items.length === 0) {
    return (
      <Empty className="rounded-lg border border-border bg-card py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Puzzle />
          </EmptyMedia>
          <EmptyTitle>{t("empty.title")}</EmptyTitle>
          <EmptyDescription>{t("empty.description")}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onOpenCatalog}>
            <Search />
            {tc("openCatalog")}
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    // minmax(0) so wide controls scroll instead of stretching the page on mobile
    <div className="grid gap-3 max-md:grid-cols-[minmax(0,1fr)]">
      {updates.length > 0 && (
        <div className="tone-amber flex items-center gap-3 rounded-lg border border-tone/25 bg-tone/9 px-3 py-2.5 text-[13px]">
          <Plate tone="amber" size="sm">
            <Zap />
          </Plate>
          <span className="min-w-0 flex-1 truncate">
            <b className="font-semibold">{tc("updates", updates.length)}</b>
            <span className="text-muted-foreground"> · {updates.map(displayName).join(", ")}</span>
          </span>
          {canUpdate && (
            <Button size="sm" variant="outline" disabled={updateMutation.isPending} onClick={() => void updateAll()}>
              <Download />
              {tc("updateAll")}
            </Button>
          )}
        </div>
      )}

      <Panel>
        <PanelHead className="flex-wrap gap-3 py-2">
          <InputGroup className="w-full sm:w-64">
            <InputGroupAddon>
              <Search className="size-3.5" />
            </InputGroupAddon>
            <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tc("search")} />
          </InputGroup>
          <PanelActions className="max-sm:ml-0 max-sm:w-full max-sm:overflow-x-auto max-sm:scrollbar-hide">
            <ToggleGroup variant="segmented" value={[filter]} onValueChange={(next) => next[0] && setFilter(next[0] as Filter)}>
              {(Object.keys(FILTERS) as Filter[]).map((key) => (
                <Toggle key={key} variant="segmented" value={key}>
                  {tc(`filters.${key}`)}
                  <span className="text-[11px] text-muted-foreground tabular-nums">{items.filter(FILTERS[key]).length}</span>
                </Toggle>
              ))}
            </ToggleGroup>
          </PanelActions>
        </PanelHead>

        {rows.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchX />
              </EmptyMedia>
              <EmptyTitle>{tc("noMatchesTitle")}</EmptyTitle>
              <EmptyDescription>{tc("noMatchesDescription")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          // Fixed layout so long descriptions truncate instead of pushing the actions out
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{tc("headers.name")}</TableHead>
                <TableHead className="w-36 max-sm:w-24">{tc("headers.version")}</TableHead>
                <TableHead className="hidden w-48 @xl/table:table-cell">{tc("headers.status")}</TableHead>
                <TableHead className="hidden w-52 @4xl/table:table-cell">{tc("headers.file")}</TableHead>
                <TableHead className="hidden w-28 @3xl/table:table-cell">{tc("headers.installed")}</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((item) => (
                <InstalledRow
                  key={item.id}
                  item={item}
                  kind={kind}
                  onUpdate={canUpdate ? openInstall : undefined}
                  onRemove={canRemove ? openRemove : undefined}
                />
              ))}
            </TableBody>
          </Table>
        )}

        <PanelFoot className="flex-wrap">
          <span>
            {t("count", items.length)} · <span className="font-mono">{tc("folder", config.installFolder)}</span>
          </span>
          <span className="ml-auto">{tc("manualNote")}</span>
        </PanelFoot>
      </Panel>
    </div>
  );
}
