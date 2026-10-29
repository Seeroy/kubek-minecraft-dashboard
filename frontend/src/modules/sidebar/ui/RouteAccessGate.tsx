"use client";
import { useServerStore } from "@/modules/server";
import { allNavigation, serverScopedRoutes } from "@/modules/sidebar/data/navigation";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { meetsAccess } from "@/shared/lib/access";
import { sectionPath } from "@/shared/lib/routeTabs";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { Lock } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Same rule as the sidebar, so a typed URL does not open a page the user cannot read */
export function RouteAccessGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation("modules.sidebar");
  const section = sectionPath(usePathname());
  const user = useAuthStore((s) => s.user);
  const selectedServerId = useServerStore().selectedServer?.id;

  const item = allNavigation.find((entry) => entry.href === section);
  if (!item?.access) return children;
  // The profile is still loading, the preloader covers the page
  if (!user) return null;
  // Without a server the page shows its own empty state
  const serverScoped = serverScopedRoutes.has(item.href);
  if (serverScoped && !selectedServerId) return children;
  if (meetsAccess(user, item.access, serverScoped ? selectedServerId : null)) return children;

  return (
    <Empty className="h-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Lock />
        </EmptyMedia>
        <EmptyTitle>{t("navigation.locked")}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  );
}
