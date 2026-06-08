"use client";

import { useExtensionRegistry } from "@/modules/extensions/api/extensions.queries";
import * as Icons from "lucide-react";
import { Puzzle } from "lucide-react";
import type { ComponentType } from "react";
import { useMemo } from "react";

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

  return useMemo(() => {
    return (registry ?? []).flatMap((ext) =>
      (ext.contributes.sidebar ?? []).map((item) => ({
        label: item.label,
        // Static export has no dynamic routes, so the target rides in a ?view= param
        href: `/ext?view=${item.route}`,
        icon: resolveIcon(item.icon),
        permission: item.permission,
      }))
    );
  }, [registry]);
}

function resolveIcon(name: string): ComponentType<{ className?: string }> {
  const lib: Record<string, unknown> = Icons;
  const found = lib[name];
  return typeof found === "function"
    ? (found as ComponentType<{ className?: string }>)
    : Puzzle;
}
