"use client";

import { useExtensionSidebarItems } from "@/modules/extensions";
import { allNavigation, serverScopedRoutes } from "@/modules/sidebar/data/navigation";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { sectionPath } from "@/shared/lib/routeTabs";
import { usePathname, useSearchParams } from "next/navigation";
import type { ComponentType } from "react";

export interface CurrentSection {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  serverScoped: boolean;
}

/** Nav entry for the open route, extension pages resolve through ?view= */
export function useCurrentSection(): CurrentSection | null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const extensionItems = useExtensionSidebarItems();
  const { t } = useTranslation();

  const section = sectionPath(pathname);
  const item = allNavigation.find((entry) => entry.href === section);
  if (item) {
    return {
      key: item.href,
      label: t(`modules.sidebar.${item.nameKey}`),
      icon: item.icon,
      serverScoped: serverScopedRoutes.has(item.href),
    };
  }

  const view = searchParams.get("view");
  const extension = view
    ? extensionItems.find((entry) => entry.href === `/ext?view=${view}`)
    : undefined;
  if (extension) {
    return { key: extension.href, label: t(extension.label), icon: extension.icon, serverScoped: false };
  }

  return null;
}
