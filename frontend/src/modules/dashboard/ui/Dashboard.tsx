"use client";
import { ExtensionSlot } from "@/modules/extensions";
import { useIsMobile } from "@/shared/hooks/useIsMobile";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAuthStore } from "@/shared/stores/auth-store";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { PageLayout } from "@/shared/ui/PageLayout";
import { PageLoading } from "@/shared/ui/PageLoading";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { LayoutDashboard, Pencil, Plus, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import type { Layout, ResponsiveLayouts } from "react-grid-layout";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { useDashboardLayout } from "../hooks/useDashboardLayout";
import { useDashboardWidgets } from "../hooks/useDashboardWidgets";
import {
  DASHBOARD_BREAKPOINTS,
  DASHBOARD_COLS,
  DASHBOARD_ROW_HEIGHT,
} from "../lib/widgetRegistry";
import type { WidgetId } from "../types/widget.types";
import DashboardWidget from "./DashboardWidget";
import DashboardStatsRow from "./stats/DashboardStatsRow";

export default function Dashboard() {
  const { t } = useTranslation("modules.dashboard");
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const username = useAuthStore((s) => s.user?.username);
  const welcomeTitle = username
    ? t("header.welcome", username)
    : t("header.title");
  const widgets = useDashboardWidgets();
  const { state, isLoading, setLayouts, setVisible, reset } =
    useDashboardLayout(widgets);
  const { width, containerRef, mounted } = useContainerWidth();
  const isMobile = useIsMobile();
  const [editMode, setEditMode] = useState(false);

  // The drag/resize bento grid is a desktop view; phones get a plain stack
  const effectiveEditMode = editMode && !isMobile;

  // Widgets the user is allowed to see at all
  const permitted = useMemo(
    () =>
      widgets.filter(
        (w) => !w.requiredPermission || hasPermission(w.requiredPermission)
      ),
    [widgets, hasPermission]
  );

  const visibleWidgets = useMemo(
    () => permitted.filter((w) => state?.visible[w.id] ?? true),
    [permitted, state]
  );

  const hiddenWidgets = useMemo(
    () => permitted.filter((w) => !(state?.visible[w.id] ?? true)),
    [permitted, state]
  );

  // Restrict layouts to currently rendered widgets
  const layouts = useMemo<ResponsiveLayouts>(() => {
    if (!state) return {};
    const visibleIds = new Set(visibleWidgets.map((w) => w.id));
    const filtered: ResponsiveLayouts = {};
    for (const [bp, layout] of Object.entries(state.layouts)) {
      filtered[bp] = (layout as Layout).filter((item) =>
        visibleIds.has(item.i as WidgetId)
      );
    }
    return filtered;
  }, [state, visibleWidgets]);

  // On mobile stack widgets like a flex
  const stackedWidgets = useMemo(() => {
    const lg = state?.layouts.lg ?? [];
    const pos = (id: WidgetId) => {
      const item = lg.find((i) => i.i === id);
      return item ? item.y * 1000 + item.x : Number.MAX_SAFE_INTEGER;
    };
    return [...visibleWidgets].sort((a, b) => pos(a.id) - pos(b.id));
  }, [visibleWidgets, state]);

  if (isLoading || !state) {
    return (
      <PageLayout className="mx-auto w-full max-w-7xl">
        <BlockHeader
          kicker={welcomeTitle}
          title={welcomeTitle}
          description={t("header.description")}
          icon={LayoutDashboard}
          color="primary"
        />
        <PageLoading />
      </PageLayout>
    );
  }

  return (
    <PageLayout className="mx-auto w-full">
      <BlockHeader
        kicker={welcomeTitle}
        title={welcomeTitle}
        description={t("header.description")}
        icon={LayoutDashboard}
        color="blue"
        actions={
          isMobile ? undefined : (
            <>
              {editMode && hiddenWidgets.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="outline" size="sm">
                        <Plus className="mr-1.5 h-4 w-4" />
                        {t("toolbar.addWidget")}
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    {hiddenWidgets.map((widget) => (
                      <DropdownMenuItem
                        key={widget.id}
                        onClick={() => setVisible(widget.id, true)}
                      >
                        <widget.icon className="mr-2 h-4 w-4" />
                        {widget.title ?? t(widget.titleKey)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {editMode && (
                <Button variant="ghost" size="sm" onClick={reset}>
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  {t("toolbar.reset")}
                </Button>
              )}
              <Button
                variant={editMode ? "default" : "outline"}
                size="sm"
                onClick={() => setEditMode((v) => !v)}
              >
                <Pencil className="mr-1.5 h-4 w-4" />
                {editMode ? t("toolbar.done") : t("toolbar.edit")}
              </Button>
            </>
          )
        }
      />

      <DashboardStatsRow />

      <ExtensionSlot name="dashboard.header" />

      {isMobile ? (
        // Plain vertical stack
        <div className="mt-4 flex flex-col gap-4">
          {stackedWidgets.map((widget) => {
            const Widget = widget.component;
            return (
              <DashboardWidget
                key={widget.id}
                title={widget.title ?? t(widget.titleKey)}
                icon={widget.icon}
                editMode={false}
                contentClassName={widget.contentClassName}
                bare={widget.bare}
              >
                <Widget />
              </DashboardWidget>
            );
          })}
        </div>
      ) : (
        <div ref={containerRef} className="mt-4">
          {mounted && (
            <ResponsiveGridLayout
              width={width}
              breakpoints={DASHBOARD_BREAKPOINTS}
              cols={DASHBOARD_COLS}
              rowHeight={DASHBOARD_ROW_HEIGHT}
              layouts={layouts}
              margin={[16, 16]}
              containerPadding={[0, 0]}
              dragConfig={{
                enabled: effectiveEditMode,
                handle: ".dashboard-drag-handle",
                cancel: "button, a",
              }}
              resizeConfig={{ enabled: effectiveEditMode }}
              onLayoutChange={(_layout, allLayouts) => setLayouts(allLayouts)}
            >
              {visibleWidgets.map((widget) => {
                const Widget = widget.component;
                return (
                  <div key={widget.id}>
                    <DashboardWidget
                      title={widget.title ?? t(widget.titleKey)}
                      icon={widget.icon}
                      editMode={effectiveEditMode}
                      onHide={() => setVisible(widget.id, false)}
                      contentClassName={widget.contentClassName}
                      bare={widget.bare}
                    >
                      <Widget />
                    </DashboardWidget>
                  </div>
                );
              })}
            </ResponsiveGridLayout>
          )}
        </div>
      )}
    </PageLayout>
  );
}
