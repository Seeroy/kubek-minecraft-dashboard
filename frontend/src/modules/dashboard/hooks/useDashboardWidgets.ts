"use client";

import { DynamicExtensionComponent } from "@/modules/extensions";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useExtensionRegistry } from "@/modules/extensions/api/extensions.queries";
import { Blocks } from "lucide-react";
import type { ComponentType } from "react";
import { createElement, useMemo } from "react";
import { WIDGETS } from "../lib/widgetRegistry";
import type { WidgetDefinition } from "../types/widget.types";

/**
 * Built-in widgets plus any contributed by active extensions, so extension widgets show up in the
 * grid (add / drag / resize / persist) exactly like native ones. Extension ids are ext:<extId>:<id>
 */
export function useDashboardWidgets(): WidgetDefinition[] {
  const { data: registry } = useExtensionRegistry();
  const { t } = useTranslation();

  const extDefs = useMemo(
    () =>
      (registry ?? []).flatMap((ext) =>
        (ext.contributes.dashboardWidgets ?? []).map((w) => {
          const Widget: ComponentType = () =>
            createElement(DynamicExtensionComponent, {
              bundleUrl: ext.bundleUrl,
              name: w.component,
            });
          return {
            id: `ext:${ext.id}:${w.id}`,
            titleKey: w.label,
            icon: Blocks,
            component: Widget,
            defaultLayout: {
              w: w.defaultSize?.w ?? 2,
              h: w.defaultSize?.h ?? 2,
              minW: 1,
              minH: 1,
            },
          } satisfies WidgetDefinition;
        })
      ),
    [registry]
  );

  return useMemo(
    () => [...WIDGETS, ...extDefs.map((d) => ({ ...d, title: t(d.titleKey) }))],
    [extDefs, t]
  );
}
