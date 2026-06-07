"use client";
import { useExtensionSidebarItems } from "@/modules/extensions";
import { useServerStore } from "@/modules/server";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { useUpdateCheckQuery } from "@/modules/settings/api/about.queries";
import {
  adminNavigation,
  allNavigation,
  navigation,
  type NavItem,
} from "@/modules/sidebar/data/navigation";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { routeAllowedByBlueprint } from "@/shared/lib/serverRestrictions";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useSidebarStore } from "@/shared/stores/sidebar-store";
import { Skeleton } from "@/shared/ui/skeleton";
import { UserPermissions } from "@shared/types/user.types";
import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { AdminNavigationSection } from "./AdminNavigationSection";
import { LockedNavItem } from "./LockedNavItem";
import { NavLink, type NavIcon } from "./NavLink";
import { UpdateIndicator } from "./UpdateIndicator";

// Nav animation params
const NAV_TRANSITION = { duration: 0.35, ease: [0.22, 1, 0.36, 1] } as const;

// Nav item that surfaces the "update available" indicator
const PANEL_SETTINGS_HREF = "/panel-settings";

const Navigation = () => {
  const pathname = usePathname();
  const { setPage, close } = useSidebarStore();
  const { selectedServer } = useServerStore();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canAccessItem = useAuthStore((s) => s.canAccessItem);
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation("modules.sidebar");
  // Extension labels are non-namespaced keys like "ext.sentinel.title"
  const { t: tGlobal } = useTranslation();

  // Blueprint features drive route availability for the selected server
  const serverBlueprint = useBlueprint(selectedServer?.blueprintId);
  const extensionItems = useExtensionSidebarItems();

  // Only admins can reach the update-check endpoint; gate the query accordingly
  const canCheckUpdates = hasPermission(UserPermissions.KUBEK_SETTINGS);
  const hasUpdate =
    useUpdateCheckQuery(canCheckUpdates).data?.updateAvailable ?? false;

  useEffect(() => {
    const found = allNavigation.find((item) => item.href === pathname);
    if (found) {
      setPage(t(found.nameKey), found.icon);
    }
  }, [pathname, setPage, t]);

  const allowedByBlueprint = useMemo(() => {
    return (href: string) =>
      serverBlueprint ? routeAllowedByBlueprint(href, serverBlueprint) : true;
  }, [serverBlueprint]);

  const filteredNavigation = useMemo(() => {
    if (!user) return [];
    return navigation.filter((item) => allowedByBlueprint(item.href));
  }, [user, allowedByBlueprint]);

  const filteredAdminNavigation = useMemo(() => {
    if (!user) return [];
    return adminNavigation.filter((item) => allowedByBlueprint(item.href));
  }, [user, allowedByBlueprint]);

  const handleLinkClick = (name: string, icon: NavIcon) => {
    setPage(name, icon as LucideIcon);
    if (window.innerWidth < 768) close();
  };

  // Renders a static navigation entry (locked card or active link)
  const renderNavItem = (item: NavItem) => {
    const translatedName = t(item.nameKey);
    const isLocked =
      item.permission !== null &&
      item.permission !== undefined &&
      !hasPermission(item.permission);

    if (isLocked) {
      return (
        <LockedNavItem
          key={item.href}
          icon={item.icon}
          label={translatedName}
          lockedLabel={t("navigation.locked")}
        />
      );
    }

    return (
      <NavLink
        key={item.href}
        href={item.href}
        icon={item.icon}
        label={translatedName}
        isActive={pathname === item.href}
        onClick={() => handleLinkClick(translatedName, item.icon)}
        badge={
          item.href === PANEL_SETTINGS_HREF && hasUpdate ? (
            <UpdateIndicator label={t("navigation.updateAvailable")} />
          ) : undefined
        }
      />
    );
  };

  if (!user) {
    return (
      <nav
        className="grid min-h-0 flex-1 scrollbar-thin grid-cols-3 content-start gap-2 overflow-y-auto p-3 md:flex md:flex-col md:gap-0 md:space-y-1"
        aria-busy="true"
      >
        {allNavigation.map((item) => (
          <div
            key={item.href}
            className="flex aspect-square shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg p-3 md:aspect-auto md:h-10 md:flex-row md:items-center md:justify-start md:gap-3 md:px-3 md:py-0"
          >
            <Skeleton className="h-5 w-5 rounded-md md:h-[18px] md:w-[18px]" />
            <Skeleton className="h-3 w-12 md:h-3.5 md:w-24" />
          </div>
        ))}
      </nav>
    );
  }

  return (
    <motion.nav
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={NAV_TRANSITION}
      className="grid min-h-0 flex-1 scrollbar-thin auto-rows-max grid-cols-3 gap-2 overflow-y-auto p-3 md:flex md:flex-col md:gap-0 md:space-y-1"
    >
      {filteredNavigation.map(renderNavItem)}

      {/* Sidebar items contributed by active extensions */}
      {extensionItems
        .filter((item) => canAccessItem(item.permission))
        .map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={tGlobal(item.label)}
            isActive={pathname === item.href}
            onClick={() => handleLinkClick(tGlobal(item.label), item.icon)}
          />
        ))}

      {/* Collapsible Administration group for secondary items */}
      <AdminNavigationSection
        items={filteredAdminNavigation}
        title={t("navigation.administration")}
        renderItem={renderNavItem}
      />
    </motion.nav>
  );
};

export default Navigation;
