"use client";

import { useExtensionRegistry } from "@/modules/extensions/api/extensions.queries";
import { qk } from "@/shared/queries/query-keys";
import { useQuery } from "@tanstack/react-query";
import { PanelsTopLeft, Puzzle } from "lucide-react";
import type { ComponentType } from "react";
import { useMemo } from "react";
import { extensionHref, navGroupOf, type ExtensionNavGroup } from "../lib/nav";
import { loadIcons } from "./icons";

export interface ExtensionSidebarItem {
  /** i18n key from the extension locales, or plain text */
  label: string;
  /** /ext?view=<route>, server tabs add &tab=<id> */
  href: string;
  icon: ComponentType<{ className?: string }>;
  permission?: string;
  /** where the item goes in the sidebar, server items only show with a selected server */
  group: ExtensionNavGroup;
}

/** Sidebar items and server tabs contributed by active extensions, with their lucide icon resolved by name */
export function useExtensionSidebarItems(): ExtensionSidebarItem[] {
  const { data: registry } = useExtensionRegistry();
  const hasItems = !!registry?.some((ext) => ext.contributes.sidebar?.length);
  const { data: icons } = useQuery({
    queryKey: qk.extensions.icons(),
    queryFn: loadIcons,
    enabled: hasItems,
    staleTime: Infinity,
    structuralSharing: false,
  });

  return useMemo(() => {
    return (registry ?? []).flatMap((ext) => [
      ...(ext.contributes.sidebar ?? []).map((item) => ({
        label: item.label,
        // Static export has no dynamic routes, so the target rides in a ?view= param
        href: extensionHref(item.route),
        icon: resolveIcon(icons, item.icon),
        permission: item.permission,
        group: navGroupOf(item.section),
      })),
      ...(ext.contributes.serverTabs ?? []).map((tab) => ({
        label: tab.label,
        href: extensionHref(`${ext.id}/${tab.component}`, tab.id),
        icon: PanelsTopLeft,
        permission: tab.permission,
        group: "server" as const,
      })),
    ]);
  }, [registry, icons]);
}

export function resolveIcon(lib: Record<string, unknown> | undefined, name: string | null | undefined): ComponentType<{ className?: string }> {
  // Icon exports are PascalCase forwardRef objects, other exports like "icons" are not components
  const found = name && /^[A-Z]/.test(name) ? lib?.[name] : undefined;
  return found && typeof found === "object" ? (found as ComponentType<{ className?: string }>) : Puzzle;
}
