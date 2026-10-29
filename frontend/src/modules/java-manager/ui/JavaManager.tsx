"use client";

import type { JavaVersion } from "@/api/java/java.model";
import { useNotifications } from "@/modules/notifications";
import { useServerStore } from "@/modules/server";
import { useRouteTab } from "@/shared/hooks/useRouteTab";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { confirmDialog } from "@/shared/modals";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { PageHeader } from "@/shared/ui/page-header";
import { SettingsGroup } from "@/shared/ui/settings";
import type { Tone } from "@/shared/ui/tone";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AccessArea } from "@shared/access/areas";
import { Check, Coffee, Download, Folder, RotateCw, Server, Trash2, type LucideIcon } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { useDeleteJavaMutation, useInstallJavaMutation, useJavaVersions, useRemoveCustomJavaMutation } from "../api/java.queries";
import { useJavaTasks } from "../hooks/useJavaTasks";
import { majorOf, serverJavaUsage } from "../lib/java";
import { JAVA_TABS, type JavaTab } from "../lib/tabs";
import { AvailableTab } from "./AvailableTab";
import { CustomJavaForm } from "./CustomJavaForm";
import { JavaRow } from "./JavaRow";
import { UsageTab } from "./UsageTab";

const TABS: { id: JavaTab; icon: LucideIcon }[] = [
  { id: "installed", icon: Check },
  { id: "available", icon: Download },
  { id: "custom", icon: Folder },
  { id: "usage", icon: Server },
];

interface ListPanelProps {
  tone: Tone;
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}

function ListPanel({ tone, icon, title, description, children }: ListPanelProps) {
  return (
    <SettingsGroup tone={tone} icon={icon} title={title} description={description} className="mb-0" flush>
      {children}
    </SettingsGroup>
  );
}

function EmptyList({ title, description }: { title: string; description: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Coffee />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

const JavaManager = () => {
  const { t } = useTranslation("modules.javaManager");
  const { notify } = useNotifications();
  const { servers } = useServerStore();
  const java = useJavaVersions();
  const install = useInstallJavaMutation();
  const remove = useDeleteJavaMutation();
  const removeCustom = useRemoveCustomJavaMutation();
  const progress = useJavaTasks();
  const [tab, changeTab] = useRouteTab("/java", JAVA_TABS, "installed");
  const canInstall = useAuthStore((s) => s.can(AccessArea.JAVA, "write"));
  const canManage = useAuthStore((s) => s.can(AccessArea.JAVA, "manage"));

  // One list from the API holds all three kinds, a path means it is on disk
  const { installed, available, customs } = useMemo(() => {
    const all = java.data ?? [];
    return {
      installed: all.filter((v) => v.path && !v.custom).sort((a, b) => (majorOf(b.version) ?? 0) - (majorOf(a.version) ?? 0)),
      available: all.filter((v) => !v.path),
      customs: all.filter((v) => v.custom),
    };
  }, [java.data]);
  const usage = useMemo(() => serverJavaUsage(servers, customs), [servers, customs]);

  const counts: Record<JavaTab, number> = { installed: installed.length, available: available.length, custom: customs.length, usage: usage.length };
  const usersOf = (version: JavaVersion) =>
    usage
      .filter((item) => (version.custom ? item.path === version.path : item.kind === "managed" && item.major === majorOf(version.version)))
      .map((item) => item.server);

  const confirmRemove = async (version: JavaVersion) => {
    const ok = await confirmDialog({
      title: t("confirmRemove.title", version.name),
      description: version.custom ? t("confirmRemove.customDescription") : t("confirmRemove.description"),
      confirmText: t("confirmRemove.confirm"),
      cancelText: t("confirmRemove.cancel"),
      variant: "destructive",
      icon: Trash2,
    });
    if (!ok) return;
    if (version.custom && version.id) await removeCustom.mutateAsync(version.id);
    else await remove.mutateAsync(version.version);
    notify({ type: "success", title: t("toasts.removed", version.name) });
  };

  const onInstall = (version: JavaVersion) =>
    install.mutate(version.version, { onSuccess: () => notify({ type: "info", title: t("toasts.installStarted", version.version) }) });

  return (
    <div className="stagger-enter">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button variant="outline" disabled={java.isFetching} onClick={() => void java.refetch()}>
            <RotateCw className={java.isFetching ? "animate-spin" : undefined} />
            {t("refresh")}
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(value) => changeTab(value as JavaTab)} className="gap-4">
        <TabsList>
          {TABS.map(({ id, icon: Icon }) => (
            <TabsTrigger key={id} value={id}>
              <Icon />
              {t(`tabs.${id}`)}
              {java.data && <TabsCount>{counts[id]}</TabsCount>}
            </TabsTrigger>
          ))}
        </TabsList>

        {java.isLoading ? (
          <Skeleton className="h-72 rounded-lg" />
        ) : (
          <>
            <TabsContent value="installed">
              <ListPanel tone="green" icon={Coffee} title={t("installed.title")} description={t("installed.description")}>
                {installed.length === 0 ? (
                  <EmptyList title={t("installed.empty.title")} description={t("installed.empty.description")} />
                ) : (
                  installed.map((version) => (
                    <JavaRow
                      key={version.version}
                      major={majorOf(version.version)}
                      title={version.name}
                      badges={
                        <>
                          <Badge variant="success">{t("installed.badge")}</Badge>
                          <Badge variant="secondary" className="uppercase">
                            {version.type}
                          </Badge>
                        </>
                      }
                      meta={
                        <>
                          {version.vendor && <span>{t("installed.vendor", version.vendor)}</span>}
                          {version.runtime && <span className="font-mono">{version.runtime}</span>}
                        </>
                      }
                      path={version.path}
                      usedBy={usersOf(version)}
                      removing={remove.isPending}
                      onRemove={canManage ? () => void confirmRemove(version) : undefined}
                    />
                  ))
                )}
              </ListPanel>
            </TabsContent>

            <TabsContent value="available">
              <AvailableTab available={available} progress={progress} pending={install.isPending ? install.variables : undefined} onInstall={canInstall ? onInstall : undefined} />
            </TabsContent>

            <TabsContent value="custom" className="grid gap-4">
              {canManage && <CustomJavaForm />}
              <ListPanel tone="purple" icon={Folder} title={t("custom.list.title")} description={t("custom.list.description")}>
                {customs.length === 0 ? (
                  <EmptyList title={t("custom.list.empty.title")} description={t("custom.list.empty.description")} />
                ) : (
                  customs.map((version) => (
                    <JavaRow
                      key={version.id ?? version.path}
                      major={majorOf(version.version)}
                      title={version.name}
                      badges={<Badge variant="info">{t("custom.list.badge")}</Badge>}
                      meta={
                        <>
                          <span>Java {version.version}</span>
                          {version.vendor && <span>{version.vendor}</span>}
                        </>
                      }
                      path={version.path}
                      usedBy={usersOf(version)}
                      removing={removeCustom.isPending}
                      onRemove={canManage ? () => void confirmRemove(version) : undefined}
                    />
                  ))
                )}
              </ListPanel>
            </TabsContent>

            <TabsContent value="usage">
              <UsageTab usage={usage} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default JavaManager;
