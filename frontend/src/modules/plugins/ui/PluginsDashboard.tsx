"use client";

import type { ContentKind } from "@/api";
import { api } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { INSTALL_PLUGIN_MODAL_ID } from "@/modules/plugins/modals/InstallPluginModal";
import { REMOVE_PLUGIN_MODAL_ID } from "@/modules/plugins/modals/RemovePluginModal";
import { useServerStore } from "@/modules/server";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useInstalledContent } from "@/shared/queries";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Button } from "@/shared/ui/button";
import { PageLayout } from "@/shared/ui/PageLayout";
import { PageTabsHeader } from "@/shared/ui/PageTabsHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { InstalledPluginView } from "@shared/types/plugins";
import {
  Loader2,
  Monitor,
  Plug,
  RefreshCcw,
  Settings,
  Upload,
  UploadCloud,
} from "lucide-react";
import { useMemo, useRef } from "react";
import { getContentKind } from "../content-kind";
import { useContentUpload } from "../hooks/useContentUpload";
import { AvailablePluginsTab } from "./AvailablePluginsTab";
import { InstalledPluginsTab } from "./InstalledPluginsTab";

interface ContentDashboardProps {
  kind?: ContentKind;
}

const PluginsDashboard = ({ kind = "plugin" }: ContentDashboardProps) => {
  const { selectedServer } = useServerStore();
  const { openModal } = useModal();
  const { notify } = useNotifications();
  const blueprint = useBlueprint(selectedServer?.blueprintId);
  const config = getContentKind(kind);
  const { t } = useTranslation(`${config.i18nNs}.dashboard`);

  const installedQuery = useInstalledContent(kind, selectedServer?.id);
  const installed = installedQuery.data ?? [];
  const isInstalledLoading = installedQuery.isFetching;

  const reloadInstalled = () => installedQuery.refetch();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const upload = useContentUpload({
    serverId: selectedServer?.id,
    folder: config.installFolder,
    t,
    onComplete: reloadInstalled,
  });

  const handleOpenInstall = (projectId: string, initialVersionId?: string) => {
    if (!selectedServer) {
      notify({ title: t("notifications.selectServerFirst"), type: "error" });
      return;
    }
    if (!projectId) {
      notify({ title: t("notifications.missingProjectId"), type: "error" });
      return;
    }

    openModal(INSTALL_PLUGIN_MODAL_ID, {
      kind,
      serverId: selectedServer.id,
      projectId,
      initialVersionId,
      mode: "install",
      onComplete: reloadInstalled,
    });
  };

  const handleUpdate = (plugin: InstalledPluginView) => {
    if (!selectedServer || plugin.type === "manual") return;
    openModal(INSTALL_PLUGIN_MODAL_ID, {
      kind,
      serverId: selectedServer.id,
      projectId: plugin.metadata!.id,
      // Preselect the newest compatible version when an update is available
      initialVersionId: plugin.latestVersion?.id ?? plugin.version!.id,
      pluginRecordId: plugin.id,
      mode: "update",
      onComplete: reloadInstalled,
    });
  };

  const handleRemove = async (plugin: InstalledPluginView) => {
    if (!selectedServer) return;

    if (plugin.type === "manual") {
      // For manual plugins, delete the file directly
      try {
        await api.files.deleteFile(selectedServer.id, {
          path: `${config.installFolder}/${plugin.fileName}`,
        });
        notify({
          title: t("notifications.manualRemoveSuccess", plugin.fileName),
          type: "success",
        });
        reloadInstalled();
      } catch (error: any) {
        notify({
          title: error?.message || t("notifications.manualRemoveFailed"),
          type: "error",
        });
      }
    } else {
      // For Modrinth-managed entries, use the modal
      openModal(REMOVE_PLUGIN_MODAL_ID, {
        kind,
        serverId: selectedServer.id,
        plugin,
        onComplete: reloadInstalled,
      });
    }
  };

  const installedDependencies = useMemo(() => {
    const dependencyIds = new Set(
      installed
        .filter((plugin) => Boolean(plugin.dependencyOf))
        .map((plugin) => plugin.id)
    );
    return dependencyIds;
  }, [installed]);

  if (!selectedServer) {
    return (
      <PageLayout className="flex h-full flex-col items-center justify-center">
        <Plug className="h-10 w-10 text-muted-foreground" />
        <div className="space-y-1 text-center">
          <p className="text-lg font-semibold">{t("states.noServer.title")}</p>
          <p className="text-sm text-muted-foreground">
            {t("states.noServer.description")}
          </p>
        </div>
      </PageLayout>
    );
  }

  if (!config.isAvailable(blueprint)) {
    return (
      <PageLayout className="flex h-full flex-col items-center justify-center">
        <Plug className="h-10 w-10 text-muted-foreground" />
        <div className="space-y-1 text-center">
          <p className="text-lg font-semibold">
            {t("states.notAvailable.title")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("states.notAvailable.description")}
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <BlockHeader
        kicker={t("header.title")}
        title={t("header.title")}
        description={t("header.description")}
        icon={config.icon}
        color="green"
      />
      <Tabs defaultValue="installed">
        <PageTabsHeader
          tabs={
            <TabsList>
              <TabsTrigger
                value="installed"
                className="flex items-center gap-2"
              >
                <Monitor className="h-4 w-4" />
                {t("tabs.installed")}
              </TabsTrigger>
              <TabsTrigger
                value="available"
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                {t("tabs.available")}
              </TabsTrigger>
            </TabsList>
          }
          actions={
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jar"
                multiple
                className="hidden"
                onChange={upload.handleInputChange}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={upload.isUploading}
                className="flex-shrink-0"
              >
                {upload.isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("actions.uploading")}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {t("actions.upload")}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  reloadInstalled();
                }}
                disabled={isInstalledLoading}
                className="flex-shrink-0"
              >
                {isInstalledLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("actions.refreshing")}
                  </>
                ) : (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {t("actions.refresh")}
                  </>
                )}
              </Button>
            </>
          }
        />

        <div
          className="relative min-h-[60vh]"
          onDragEnter={upload.handleDragEnter}
          onDragLeave={upload.handleDragLeave}
          onDragOver={upload.handleDragOver}
          onDrop={upload.handleDrop}
        >
          <TabsContent value="installed" className="mt-6">
            <InstalledPluginsTab
              installed={installed}
              isInstalledLoading={isInstalledLoading}
              installedDependencies={installedDependencies}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
            />
          </TabsContent>

          <TabsContent value="available" className="mt-6">
            <AvailablePluginsTab
              kind={kind}
              selectedServer={selectedServer}
              onInstall={handleOpenInstall}
            />
          </TabsContent>

          {upload.isDragOver && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary/70 bg-primary/5 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2 text-primary">
                <UploadCloud className="h-10 w-10" />
                <p className="text-sm font-medium">{t("dropzone.hint")}</p>
              </div>
            </div>
          )}
        </div>
      </Tabs>
    </PageLayout>
  );
};

export default PluginsDashboard;
