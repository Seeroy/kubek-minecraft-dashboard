"use client";

import { BlockedNotice } from "@/modules/catalog";
import { useNotifications } from "@/modules/notifications";
import { useCatalogView } from "@/modules/plugins/hooks/useCatalogView";
import { useRouteTab } from "@/shared/hooks/useRouteTab";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { confirmDialog } from "@/shared/modals";
import { qk } from "@/shared/queries/query-keys";
import { useAuthStore } from "@/shared/stores/auth-store";
import type { InstalledExtension } from "@/shared/types/extensions.types";
import { Button } from "@/shared/ui/button";
import { DataReveal } from "@/shared/ui/data-reveal";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { FileDropZone } from "@/shared/ui/file-drop-zone";
import { PageHeader } from "@/shared/ui/page-header";
import { Panel } from "@/shared/ui/panel";
import { Plate } from "@/shared/ui/plate";
import { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { ViewModeToggle } from "@/shared/ui/ViewModeToggle";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { AccessArea } from "@shared/access/areas";
import { Blocks, PackageSearch, RotateCw, Shield, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  useConsentExtensionMutation,
  useDisableExtensionMutation,
  useEnableExtensionMutation,
  useExtensions,
  useExtensionsCatalog,
  useInstallExtensionMutation,
  useRefreshExtensionsCatalogMutation,
  useRemoveExtensionMutation,
} from "../api/extensions.queries";
import { ExtensionRow, needsConsent } from "./ExtensionRow";
import { SAMPLE_EXTENSIONS } from "../data/samples";
import { EXTENSION_TABS, type ExtensionTab } from "../lib/tabs";
import { ExtensionsCatalog } from "./ExtensionsCatalog";

type Filter = "all" | "active" | "attention";

const FILTERS: Record<Filter, (ext: InstalledExtension) => boolean> = {
  all: () => true,
  active: (ext) => ext.active,
  attention: (ext) => ext.status === "error" || needsConsent(ext),
};

export const ExtensionsManager = () => {
  const { t } = useTranslation("modules.extensions");
  const { notify } = useNotifications();
  const queryClient = useQueryClient();
  const canManage = useAuthStore((s) => s.can(AccessArea.INTEGRATIONS, "manage"));
  // The backend lets only admins install, same as uploads
  const isAdmin = useAuthStore((s) => s.user?.isAdmin ?? false);
  const [routeTab, changeTab] = useRouteTab("/extensions", EXTENSION_TABS, "installed");
  const tab: ExtensionTab = canManage ? routeTab : "installed";
  const catalogView = useCatalogView();
  // Also feeds the blocked notice, so it loads on the installed tab too
  const catalog = useExtensionsCatalog({ enabled: canManage });
  const extensions = useExtensions();
  const install = useInstallExtensionMutation();
  const consent = useConsentExtensionMutation();
  const enable = useEnableExtensionMutation();
  const disable = useDisableExtensionMutation();
  const remove = useRemoveExtensionMutation();
  const reloading = useIsFetching({ queryKey: qk.extensions.all }) > 0;
  const refreshCatalog = useRefreshExtensionsCatalogMutation();
  const refreshing = tab === "catalog" ? refreshCatalog.isPending || catalog.isFetching : reloading;
  const refresh = () =>
    tab === "catalog" ? refreshCatalog.mutate() : void queryClient.invalidateQueries({ queryKey: qk.extensions.all });
  const [filter, setFilter] = useState<Filter>("all");
  // Freshly installed extensions open so their access request is in view
  const [open, setOpen] = useState<Set<string>>(new Set());
  const busy = consent.isPending || enable.isPending || disable.isPending || remove.isPending;

  const all = extensions.data ?? [];
  const names = useMemo(() => new Map((extensions.data ?? []).map((ext) => [ext.id, ext.manifest.name])), [extensions.data]);
  const updates = catalog.data?.items.filter((item) => item.updateAvailable).length ?? 0;
  const shown = all.filter(FILTERS[filter]);

  const toggleOpen = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const onFile = (file: File) =>
    install.mutate(file, {
      onSuccess: (result) => {
        setOpen((prev) => new Set(prev).add(result.id));
        notify({ type: "success", title: t("toasts.installed", result.manifest.name) });
      },
    });

  const onConsent = (ext: InstalledExtension, capabilities: InstalledExtension["grantedCapabilities"]) =>
    consent.mutate(
      { id: ext.id, capabilities },
      {
        onSuccess: () => {
          const complete = (ext.manifest.permissions?.requires ?? []).every((cap) => capabilities.includes(cap));
          notify(complete ? { type: "success", title: t("toasts.consent") } : { type: "warning", title: t("access.incomplete") });
        },
      }
    );

  const onEnabledChange = (ext: InstalledExtension, enabled: boolean) =>
    (enabled ? enable : disable).mutate(ext.id, {
      onSuccess: () => notify({ type: enabled ? "success" : "info", title: t(enabled ? "toasts.enabled" : "toasts.disabled", ext.manifest.name) }),
    });

  const onRemove = async (ext: InstalledExtension) => {
    const ok = await confirmDialog({
      title: t("confirmRemove.title", ext.manifest.name),
      description: t("confirmRemove.description"),
      confirmText: t("confirmRemove.confirm"),
      cancelText: t("confirmRemove.cancel"),
      variant: "destructive",
      icon: Trash2,
    });
    if (!ok) return;
    await remove.mutateAsync(ext.id);
    notify({ type: "success", title: t("toasts.removed", ext.manifest.name) });
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
            {t("reload")}
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(value) => changeTab(value as ExtensionTab)} className="gap-4">
        {canManage && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="installed">
                <Blocks />
                {t("tabs.installed")}
                {extensions.data && <TabsCount>{all.length}</TabsCount>}
              </TabsTrigger>
              <TabsTrigger value="catalog">
                <PackageSearch />
                {t("tabs.catalog")}
                {updates > 0 && <TabsCount className="bg-primary/14 text-primary">{updates}</TabsCount>}
              </TabsTrigger>
            </TabsList>
            {tab === "catalog" && (
              <ViewModeToggle
                value={catalogView.view}
                onChange={catalogView.changeView}
                label={t("tabs.view")}
                cardsLabel={t("tabs.cards")}
                tableLabel={t("tabs.table")}
              />
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
              icon={<Blocks />}
              tone="purple"
              title={t("upload.title")}
              hint={t("upload.hint")}
              accept=".kubekext,.zip,.json"
              buttonLabel={t("upload.choose")}
              busyLabel={t("upload.installing")}
              busy={install.isPending}
              onFile={onFile}
            />
          )}

          {/* Same filter bar as server types, outside the panel so it never squeezes on mobile */}
          <ToggleGroup
            variant="segmented"
            className="mt-2 max-w-full scrollbar-hide overflow-x-auto"
            value={[filter]}
            onValueChange={(next) => next[0] && setFilter(next[0] as Filter)}
          >
            {(Object.keys(FILTERS) as Filter[]).map((key) => (
              <Toggle key={key} variant="segmented" value={key} className="shrink-0">
                {t(`list.filters.${key}`)}
                <span className="text-[11px] text-muted-foreground tabular-nums">{all.filter(FILTERS[key]).length}</span>
              </Toggle>
            ))}
          </ToggleGroup>

          <Panel>
            {!extensions.isLoading && shown.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Blocks />
                  </EmptyMedia>
                  <EmptyTitle>{all.length ? t("list.noMatches") : t("list.empty")}</EmptyTitle>
                  {!all.length && canManage && <EmptyDescription>{t("list.emptyHint")}</EmptyDescription>}
                </EmptyHeader>
              </Empty>
            ) : (
              <DataReveal id="extensions-list" data={shown} loading={extensions.isLoading} sample={SAMPLE_EXTENSIONS}>
                {(shown) => (
                  shown.map((ext) => (
                    <ExtensionRow
                      key={`${ext.id}:${ext.grantedCapabilities.join(",")}`}
                      ext={ext}
                      open={open.has(ext.id)}
                      busy={busy}
                      canManage={canManage}
                      onToggleOpen={() => toggleOpen(ext.id)}
                      onConsent={(capabilities) => onConsent(ext, capabilities)}
                      onEnabledChange={(enabled) => onEnabledChange(ext, enabled)}
                      onRemove={() => void onRemove(ext)}
                    />
                  ))
                )}
              </DataReveal>
            )}
          </Panel>
        </TabsContent>
        {canManage && (
          <TabsContent value="catalog">
            <ExtensionsCatalog
              view={catalogView.view}
              canInstall={isAdmin}
              onInstalled={(id) => {
                setOpen((prev) => new Set(prev).add(id));
                changeTab("installed");
              }}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
