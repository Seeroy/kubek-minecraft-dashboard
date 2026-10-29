"use client";

import { useExtensionRegistry } from "@/modules/extensions/api/extensions.queries";
import { qk } from "@/shared/queries/query-keys";
import { useQuery } from "@tanstack/react-query";
import { Puzzle } from "lucide-react";
import type { ComponentType } from "react";
import { useMemo } from "react";
import { loadIcons } from "./icons";

export interface ExtensionSidebarItem {
  /** display label (extensions provide a plain label, not an i18n key the panel owns) */
  label: string;
  /** /ext/<route> */
  href: string;
  icon: ComponentType<{ className?: string }>;
  permission?: string;
}

/** Sidebar items contributed by active extensions, with their lucide icon resolved by name */
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
    return (registry ?? []).flatMap((ext) =>
      (ext.contributes.sidebar ?? []).map((item) => ({
        label: item.label,
        // Static export has no dynamic routes, so the target rides in a ?view= param
        href: `/ext?view=${item.route}`,
        icon: resolveIcon(icons, item.icon),
        permission: item.permission,
      }))
    );
  }, [registry, icons]);
}

function resolveIcon(lib: Record<string, unknown> | undefined, name: string): ComponentType<{ className?: string }> {
  // Icon exports are PascalCase forwardRef objects, other exports like "icons" are not components
  const found = /^[A-Z]/.test(name) ? lib?.[name] : undefined;
  return found && typeof found === "object" ? (found as ComponentType<{ className?: string }>) : Puzzle;
}
