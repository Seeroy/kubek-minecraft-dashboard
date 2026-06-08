"use client";
import { api } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout";
import { defaultItemLayout, defaultLayoutState } from "../lib/widgetRegistry";
import type {
  DashboardLayoutState,
  WidgetDefinition,
  WidgetId,
} from "../types/widget.types";

/** Parse stored layout, reconciling it with the current widget set */
function hydrate(
  raw: string | null | undefined,
  widgets: WidgetDefinition[]
): DashboardLayoutState {
  const base = defaultLayoutState(widgets);
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as Partial<DashboardLayoutState>;
    const visible: Record<string, boolean> = {};
    for (const widget of widgets) {
      visible[widget.id] = parsed.visible?.[widget.id] ?? true;
    }
    const layouts: ResponsiveLayouts =
      parsed.layouts && Object.keys(parsed.layouts).length
        ? parsed.layouts
        : base.layouts;

    // Make sure every visible widget has a base (lg) layout entry
    const lg: LayoutItem[] = [...(layouts.lg ?? [])];
    for (const widget of widgets) {
      if (visible[widget.id] && !lg.some((item) => item.i === widget.id)) {
        lg.push(defaultItemLayout(widget.id, widgets));
      }
    }
    return { visible, layouts: { ...layouts, lg } };
  } catch {
    return base;
  }
}

export function useDashboardLayout(widgets: WidgetDefinition[]) {
  const { data, isLoading } = useQuery({
    queryKey: ["preferences", "dashboard"],
    queryFn: () => api.twofa.getPreferences(),
    staleTime: Infinity,
  });

  const [state, setState] = useState<DashboardLayoutState | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only the set of widget ids matters for reconciliation
  const widgetIdsKey = widgets.map((w) => w.id).join(",");

  // Mirror the latest state so updates can compute the next value without a side effect
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (data && state === null)
      setState(
        hydrate(data.dashboardLayout as string | null | undefined, widgets)
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, state, widgetIdsKey]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    []
  );

  const persist = useCallback((next: DashboardLayoutState) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void api.twofa.updatePreferences({
        dashboardLayout: JSON.stringify(next),
      });
    }, 600);
  }, []);

  // Pull in widgets that became known after the initial load (e.g. an extension that just activated)
  useEffect(() => {
    if (!state) return;
    const visible = { ...state.visible };
    const lg: LayoutItem[] = [...(state.layouts.lg ?? [])];
    let changed = false;
    for (const w of widgets) {
      if (!(w.id in visible)) {
        visible[w.id] = true;
        changed = true;
      }
      if (visible[w.id] && !lg.some((item) => item.i === w.id)) {
        lg.push(defaultItemLayout(w.id, widgets));
        changed = true;
      }
    }
    if (!changed) return;
    const next = { visible, layouts: { ...state.layouts, lg } };
    setState(next);
    persist(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetIdsKey, state, persist]);

  const update = useCallback(
    (updater: (prev: DashboardLayoutState) => DashboardLayoutState) => {
      const prev = stateRef.current;
      if (!prev) return;
      const next = updater(prev);
      setState(next);
      persist(next);
    },
    [persist]
  );

  const setLayouts = useCallback(
    (layouts: ResponsiveLayouts) => update((prev) => ({ ...prev, layouts })),
    [update]
  );

  const setVisible = useCallback(
    (id: WidgetId, visible: boolean) =>
      update((prev) => {
        let lg: Layout = prev.layouts.lg ?? [];
        if (visible && !lg.some((item) => item.i === id)) {
          lg = [...lg, defaultItemLayout(id, widgets)];
        }
        return {
          visible: { ...prev.visible, [id]: visible },
          layouts: { ...prev.layouts, lg },
        };
      }),
    [update, widgets]
  );

  const reset = useCallback(() => {
    const def = defaultLayoutState(widgets);
    setState(def);
    persist(def);
  }, [persist, widgets]);

  return {
    state,
    isLoading: isLoading || state === null,
    setLayouts,
    setVisible,
    reset,
  };
}
