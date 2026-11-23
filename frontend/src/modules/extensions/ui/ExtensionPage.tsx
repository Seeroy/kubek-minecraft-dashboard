"use client";

import { useExtensionRegistry } from "@/modules/extensions/api/extensions.queries";
import { useServerStore } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAuthStore } from "@/shared/stores/auth-store";
import type { ExtensionRegistryEntry } from "@/shared/types/extensions.types";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { CrashScreen } from "@/shared/ui/ErrorBoundary";
import { NoServerEmpty } from "@/shared/ui/NoServerEmpty";
import { PageError } from "@/shared/ui/PageError";
import { PageLayout } from "@/shared/ui/PageLayout";
import { Lock } from "lucide-react";
import { navGroupOf } from "../lib/nav";
import { DynamicExtensionComponent } from "./DynamicExtensionComponent";

interface Props {
  /** catch-all slug from /ext/[...slug]: [extId, ...componentPath] */
  slug: string[];
  /** serverTabs contribution id, set when the page opens as a server tab */
  tab?: string | null;
}

interface PageTarget {
  permission?: string;
  serverScoped: boolean;
}

// The contribution behind this view decides who may open it and whether it needs a server
function findTarget(ext: ExtensionRegistryEntry, view: string, component: string, tab?: string | null): PageTarget | null {
  const tabs = ext.contributes.serverTabs ?? [];
  const serverTab = tab ? tabs.find((item) => item.id === tab && item.component === component) : undefined;
  if (serverTab) return { permission: serverTab.permission, serverScoped: true };
  const item = (ext.contributes.sidebar ?? []).find((entry) => entry.route.replace(/^\/+/, "") === view);
  if (item) return { permission: item.permission, serverScoped: navGroupOf(item.section) === "server" };
  // A typed link to a component that is also a server tab keeps that tab's permission
  const sameComponent = tabs.find((entry) => entry.component === component);
  if (sameComponent) return { permission: sameComponent.permission, serverScoped: true };
  return null;
}

export const ExtensionPage = ({ slug, tab }: Props) => {
  const { t } = useTranslation("modules.extensions.page");
  const { data: registry, isLoading } = useExtensionRegistry();
  const user = useAuthStore((s) => s.user);
  const canAccessItem = useAuthStore((s) => s.canAccessItem);
  const { selectedServer } = useServerStore();
  const [extId, ...rest] = slug;
  const componentName = rest.join("/") || "Page";

  if (isLoading || !user) return null;
  const ext = (registry ?? []).find((e) => e.id === extId);
  if (!ext) {
    return (
      <PageLayout>
        <PageError message={`No active extension "${extId}"`} />
      </PageLayout>
    );
  }

  const target = findTarget(ext, slug.join("/"), componentName, tab);
  if (target?.permission && !canAccessItem(target.permission)) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Lock />
          </EmptyMedia>
          <EmptyTitle>{t("noAccess.title")}</EmptyTitle>
          <EmptyDescription>{t("noAccess.description")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (target?.serverScoped && !selectedServer) {
    return <NoServerEmpty className="h-full" title={t("noServer.title")} description={t("noServer.description")} />;
  }

  const serverId = target?.serverScoped ? selectedServer?.id : undefined;
  return (
    <PageLayout>
      <DynamicExtensionComponent
        // A fresh instance per server, so state of one server never shows on another
        key={serverId ?? "panel"}
        bundleUrl={ext.bundleUrl}
        name={componentName}
        props={serverId ? { serverId, context: { serverId } } : undefined}
        fallback={(props) => <CrashScreen {...props} />}
      />
    </PageLayout>
  );
};
