"use client";
import { useExtensionSidebarItems } from "@/modules/extensions";
import { useServerStore } from "@/modules/server";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { useUpdateCheckQuery } from "@/modules/settings/api/about.queries";
import {
  adminNavigation,
  navigation,
  serverScopedRoutes,
  type NavItem,
} from "@/modules/sidebar/data/navigation";
import { useCurrentSection } from "@/modules/sidebar/hooks/useCurrentSection";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { meetsAccess } from "@/shared/lib/access";
import { routeAllowedByBlueprint } from "@/shared/lib/serverRestrictions";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useSidebarStore } from "@/shared/stores/sidebar-store";
import { Skeleton } from "@/shared/ui/skeleton";
import { AccessArea } from "@shared/access/areas";
import { AdminNavigationSection } from "./AdminNavigationSection";
import { LockedNavItem } from "./LockedNavItem";
import { NavLink } from "./NavLink";
import { UpdateIndicator } from "./UpdateIndicator";

// Nav item that surfaces the "update available" indicator
const PANEL_SETTINGS_HREF = "/panel-settings";

function GroupLabel({ children }: { children: string }) {
  return (
    <div className="px-2 pt-3 pb-1 sidebar-mini:py-2">
      <span className="label-caps sidebar-mini:hidden">{children}</span>
      <span className="hidden h-px bg-sidebar-border sidebar-mini:block" />
    </div>
  );
}

export default function Navigation() {
  const activeKey = useCurrentSection()?.key;
  const closeDrawer = useSidebarStore((s) => s.close);
  const { selectedServer } = useServerStore();
  const can = useAuthStore((s) => s.can);
  const canAccessItem = useAuthStore((s) => s.canAccessItem);
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation("modules.sidebar");
  // Extension labels are non-namespaced keys like "ext.sentinel.title"
  const { t: tGlobal } = useTranslation();

  // Blueprint features drive route availability for the selected server
  const serverBlueprint = useBlueprint(selectedServer?.blueprintId);
  const extensionItems = useExtensionSidebarItems();

  // The update-check endpoint needs panel manage
  const hasUpdate =
    useUpdateCheckQuery(can(AccessArea.PANEL, "manage")).data?.updateAvailable ?? false;

  if (!user) {
    return (
      <nav className="min-h-0 flex-1 space-y-1 overflow-hidden p-3" aria-busy="true">
        {navigation.map((item) => (
          <div key={item.href} className="flex h-[38px] items-center gap-3 px-2.5">
            <Skeleton className="size-[18px] rounded-sm" />
            <Skeleton className="h-3.5 w-24 sidebar-mini:hidden" />
          </div>
        ))}
      </nav>
    );
  }

  const allowed = (item: NavItem) =>
    !serverBlueprint || routeAllowedByBlueprint(item.href, serverBlueprint);
  const panelItems = navigation.filter((item) => !serverScopedRoutes.has(item.href) && allowed(item));
  const serverItems = selectedServer
    ? navigation.filter((item) => serverScopedRoutes.has(item.href) && allowed(item))
    : [];
  const adminItems = adminNavigation.filter(allowed);
  const visibleExtensions = extensionItems.filter((item) => canAccessItem(item.permission));

  const renderItem = (item: NavItem) => {
    const label = t(item.nameKey);
    if (!meetsAccess(user, item.access, serverScopedRoutes.has(item.href) ? selectedServer?.id : null)) {
      return <LockedNavItem key={item.href} icon={item.icon} label={label} lockedLabel={t("navigation.locked")} />;
    }
    return (
      <NavLink
        key={item.href}
        href={item.href}
        icon={item.icon}
        label={label}
        isActive={activeKey === item.href}
        onClick={closeDrawer}
        badge={
          item.href === PANEL_SETTINGS_HREF && hasUpdate ? (
            <UpdateIndicator label={t("navigation.updateAvailable")} />
          ) : undefined
        }
      />
    );
  };

  return (
    <nav
      aria-label={t("layout.mainNav")}
      className="min-h-0 flex-1 scrollbar-thin overflow-y-auto p-3 sidebar-mini:p-2"
    >
      {panelItems.map(renderItem)}

      {serverItems.length > 0 && (
        <>
          <GroupLabel>{t("navigation.server")}</GroupLabel>
          {serverItems.map(renderItem)}
        </>
      )}

      {visibleExtensions.length > 0 && (
        <div className="mt-1">
        {visibleExtensions.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={tGlobal(item.label)}
            isActive={activeKey === item.href}
            onClick={closeDrawer}
          />
        ))}
        </div>
      )}

      <AdminNavigationSection items={adminItems} title={t("navigation.administration")} renderItem={renderItem} />
    </nav>
  );
}
