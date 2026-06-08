"use client";

import { useNotifications } from "@/modules/notifications";
import { useServerStore } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import {
  useDeleteJavaMutation,
  useInstallJavaMutation,
  useJavaVersions,
} from "@/modules/java-manager/api/java.queries";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Button } from "@/shared/ui/button";
import { PageLayout } from "@/shared/ui/PageLayout";
import { PageLoading } from "@/shared/ui/PageLoading";
import { PageTabsHeader } from "@/shared/ui/PageTabsHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import type { JavaVersion } from "@/api/java/java.model";
import { Cpu, Loader2, Package, RefreshCcw, Server } from "lucide-react";
import { useMemo, useState } from "react";
import AvailableJavaVersionsTab from "./AvailableJavaVersionsTab";
import InstalledJavaVersionsTab from "./InstalledJavaVersionsTab";
import ServerJavaUsageTab from "./ServerJavaUsageTab";

interface ServerJavaUsage {
  serverId: string;
  serverName: string;
  javaVersion: string;
  isManaged: boolean;
}

const JavaManager = () => {
  const { t } = useTranslation("modules.javaManager");
  const { servers } = useServerStore();
  const { notify } = useNotifications();

  const javaQuery = useJavaVersions();
  const installMutation = useInstallJavaMutation();
  const deleteMutation = useDeleteJavaMutation();

  const [installingVersions, setInstallingVersions] = useState<Set<string>>(
    new Set()
  );
  const [deletingVersions, setDeletingVersions] = useState<Set<string>>(
    new Set()
  );

  const allVersions = javaQuery.data ?? [];
  const installedVersions = useMemo(
    () => allVersions.filter((v) => v.path),
    [allVersions]
  );
  const availableVersions = useMemo(
    () => allVersions.filter((v) => !v.path),
    [allVersions]
  );

  const serverUsage = useMemo<ServerJavaUsage[]>(() => {
    const usage: ServerJavaUsage[] = [];
    for (const server of servers) {
      // The Java a server runs on is the JAVA_VERSION blueprint variable
      const rawJava = server.variables?.JAVA_VERSION;
      if (rawJava === undefined || rawJava === null || rawJava === "") continue;

      const isSystem = String(rawJava) === "system";
      usage.push({
        serverId: server.id,
        serverName: server.name,
        javaVersion: isSystem ? "system" : String(rawJava),
        isManaged: !isSystem,
      });
    }
    return usage;
  }, [servers]);

  const handleInstall = async (version: JavaVersion) => {
    if (installingVersions.has(version.version)) return;
    setInstallingVersions((prev) => new Set(prev).add(version.version));
    try {
      await installMutation.mutateAsync(version.version);
      notify({
        title: t("notifications.installStarted", version.version),
        message: t("notifications.installMessage"),
        type: "success",
      });
    } catch (error) {
      notify({
        title: t("errors.installFailed"),
        message: error instanceof Error ? error.message : undefined,
        type: "error",
      });
    } finally {
      setInstallingVersions((prev) => {
        const next = new Set(prev);
        next.delete(version.version);
        return next;
      });
    }
  };

  const handleDelete = async (version: JavaVersion) => {
    if (deletingVersions.has(version.version)) return;

    const isUsed = serverUsage.some(
      (usage) => usage.javaVersion === version.version && usage.isManaged
    );
    if (isUsed) {
      notify({
        title: t("errors.deleteInUseTitle"),
        message: t("errors.deleteInUseMessage"),
        type: "error",
      });
      return;
    }

    setDeletingVersions((prev) => new Set(prev).add(version.version));
    try {
      await deleteMutation.mutateAsync(version.version);
      notify({
        title: t("notifications.deleteSuccess", version.version),
        type: "success",
      });
    } catch (error: any) {
      notify({
        title: error?.message || t("notifications.deleteFailed"),
        type: "error",
      });
    } finally {
      setDeletingVersions((prev) => {
        const next = new Set(prev);
        next.delete(version.version);
        return next;
      });
    }
  };

  const isLoading = javaQuery.isLoading;
  const isFetching = javaQuery.isFetching;

  if (isLoading) {
    return (
      <PageLayout>
        <BlockHeader
          kicker={t("header.kicker")}
          title={t("header.title")}
          description={t("header.description")}
          icon={Cpu}
          color="orange"
        />
        <PageLoading />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <BlockHeader
        kicker={t("header.kicker")}
        title={t("header.title")}
        description={t("header.description")}
        icon={Cpu}
        color="orange"
      />
      <Tabs defaultValue="installed">
        <PageTabsHeader
          tabs={
            <TabsList>
              <TabsTrigger
                value="installed"
                className="flex items-center gap-2"
              >
                <Cpu className="h-4 w-4" />
                {t("tabs.installed", installedVersions.length)}
              </TabsTrigger>
              <TabsTrigger
                value="available"
                className="flex items-center gap-2"
              >
                <Package className="h-4 w-4" />
                {t("tabs.available", availableVersions.length)}
              </TabsTrigger>
              <TabsTrigger value="servers" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                {t("tabs.serverUsage", serverUsage.length)}
              </TabsTrigger>
            </TabsList>
          }
          actions={
            <Button
              variant="outline"
              onClick={() => javaQuery.refetch()}
              disabled={isFetching}
              className="flex-shrink-0"
            >
              {isFetching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("buttons.refreshing")}
                </>
              ) : (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {t("buttons.refresh")}
                </>
              )}
            </Button>
          }
        />

        <TabsContent value="installed" className="mt-6 space-y-6">
          <InstalledJavaVersionsTab
            installedVersions={installedVersions}
            serverUsage={serverUsage}
            deletingVersions={deletingVersions}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="available" className="mt-6 space-y-6">
          <AvailableJavaVersionsTab
            availableVersions={availableVersions}
            installedVersions={installedVersions}
            installingVersions={installingVersions}
            onInstall={handleInstall}
          />
        </TabsContent>

        <TabsContent value="servers" className="mt-6 space-y-6">
          <ServerJavaUsageTab serverUsage={serverUsage} />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default JavaManager;
