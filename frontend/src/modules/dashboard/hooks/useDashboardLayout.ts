"use client";
import {
  usePreferencesQuery,
  useUpdatePreferencesMutation,
} from "@/shared/queries/preferences.queries";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout";
import { defaultItemLayout, defaultLayoutState, LAYOUT_VERSION } from "../lib/widgetRegistry";
import type { DashboardLayoutState, WidgetDefinition, WidgetId } from "../types/widget.types";

const SAVE_DELAY_MS = 600;

/** Saved JSON, null when missing, broken or from an older widget set */
function parse(raw: string | null | undefined): DashboardLayoutState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DashboardLayoutState>;
    if (parsed.version !== LAYOUT_VERSION || !parsed.visible || !parsed.layouts) return null;
    return parsed as DashboardLayoutState;
  } catch {
    return null;
  }
}

/** Make sure every known widget has a visibility flag and a base layout slot */
function reconcile(state: DashboardLayoutState, widgets: WidgetDefinition[]): DashboardLayoutState {
  const visible = { ...state.visible };
  const lg: LayoutItem[] = [...(state.layouts.lg ?? [])];
  for (const widget of widgets) {
    visible[widget.id] ??= true;
    if (visible[widget.id] && !lg.some((item) => item.i === widget.id)) {
      lg.push(defaultItemLayout(widget.id, widgets));
    }
  }
  return { ...state, visible, layouts: { ...state.layouts, lg } };
}

export function useDashboardLayout(widgets: WidgetDefinition[]) {
  // No refetch, the mutation updates the cache
  const { data, isLoading, isError } = usePreferencesQuery({ staleTime: Infinity });
  // Background save, don't spam errors
  const { mutate: savePreferences } = useUpdatePreferencesMutation({ silent: true });

  // Edits made in this session, saved state stays the source until the first one
  const [edited, setEdited] = useState<DashboardLayoutState | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<DashboardLayoutState | null>(null);

  const state = useMemo(() => {
    // Without saved preferences the default layout still renders
    if (!data && !edited && !isError) return null;
    const base = edited ?? parse(data?.dashboardLayout) ?? defaultLayoutState(widgets);
    return reconcile(base, widgets);
  }, [data, edited, isError, widgets]);

  const flush = useCallback(() => {
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    // Runs on unmount too, coming back reads the cache
    savePreferences({ dashboardLayout: JSON.stringify(next) });
  }, [savePreferences]);

  // Leaving the page saves the last edit right away instead of dropping it
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      flush();
    },
    [flush]
  );

  const commit = useCallback(
    (next: DashboardLayoutState) => {
      setEdited(next);
      pending.current = next;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush]
  );

  const setLayouts = useCallback(
    (layouts: ResponsiveLayouts) => state && commit({ ...state, layouts }),
    [state, commit]
  );

  const setVisible = useCallback(
    (id: WidgetId, visible: boolean) => {
      if (!state) return;
      let lg: Layout = state.layouts.lg ?? [];
      if (visible && !lg.some((item) => item.i === id)) lg = [...lg, defaultItemLayout(id, widgets)];
      commit({ ...state, visible: { ...state.visible, [id]: visible }, layouts: { ...state.layouts, lg } });
    },
    [state, commit, widgets]
  );

  const reset = useCallback(() => commit(defaultLayoutState(widgets)), [commit, widgets]);

  return { state, isLoading: isLoading || state === null, setLayouts, setVisible, reset };
}
