"use client";
import { ExtensionSlot } from "@/modules/extensions";
import { CREATE_SERVER_MODAL_ID } from "@/modules/server";
import { useServersModal } from "@/modules/sidebar/store/servers-modal.store";
import { TopbarActions } from "@/modules/topbar";
import { useIsMobile } from "@/shared/hooks/useIsMobile";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { meetsAccess, useAccess } from "@/shared/lib/access";
import { useAuthStore } from "@/shared/stores/auth-store";
import { AccessArea } from "@shared/access/areas";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import { LayoutGrid, Pencil, Plus, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import type { Layout, ResponsiveLayouts } from "react-grid-layout";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { useDashboardLayout } from "../hooks/useDashboardLayout";
import { useDashboardWidgets } from "../hooks/useDashboardWidgets";
import { useServersSummary } from "../hooks/useServersSummary";
import { DASHBOARD_BREAKPOINTS, DASHBOARD_COLS, DASHBOARD_ROW_HEIGHT } from "../lib/widgetRegistry";
import type { WidgetDefinition, WidgetId } from "../types/widget.types";
import DashboardStats from "./DashboardStats";
import DashboardWidget from "./DashboardWidget";

const GRID_GAP = 16;

function partOfDay(hour: number) {
  if (hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "day";
  return "evening";
}

function DashboardHeader() {
  const { t } = useTranslation("modules.dashboard");
  const username = useAuthStore((s) => s.user?.username);
  const summary = useServersSummary();
  const openServers = useServersModal((s) => s.setOpen);
  const { open: openModal } = useModal();
  const canCreate = useAccess([AccessArea.SERVERS, "write"]);
  const greeting = t(`header.greeting.${partOfDay(new Date().getHours())}`, username ?? "");

  return (
    <PageHeader
      title={greeting}
      description={t("header.summary", summary.running, summary.total, summary.players)}
      actions={
        <>
          <Button variant="outline" onClick={() => openServers(true)}>
            <LayoutGrid />
            {t("actions.allServers")}
          </Button>
          {canCreate && (
            <Button onClick={() => void openModal(CREATE_SERVER_MODAL_ID)}>
              <Plus />
              {t("actions.createServer")}
            </Button>
          )}
        </>
      }
    />
  );
}

export default function Dashboard() {
  const { t } = useTranslation("modules.dashboard");
  const user = useAuthStore((s) => s.user);
  const widgets = useDashboardWidgets();
  const { state, isLoading, setLayouts, setVisible, reset } = useDashboardLayout(widgets);
  const { width, containerRef, mounted } = useContainerWidth();
  const isMobile = useIsMobile();
  const [editMode, setEditMode] = useState(false);

  // Dragging and resizing is a desktop affair, phones get a plain stack
  const editing = editMode && !isMobile;

  const permitted = useMemo(
    () => widgets.filter((w) => meetsAccess(user, w.access)),
    [widgets, user]
  );
  const visibleWidgets = permitted.filter((w) => state?.visible[w.id] ?? true);
  const hiddenWidgets = permitted.filter((w) => !(state?.visible[w.id] ?? true));

  const layouts = useMemo<ResponsiveLayouts>(() => {
    if (!state) return {};
    const ids = new Set<WidgetId>(visibleWidgets.map((w) => w.id));
    return Object.fromEntries(
      Object.entries(state.layouts).map(([bp, layout]) => [bp, (layout as Layout).filter((item) => ids.has(item.i))])
    );
  }, [state, visibleWidgets]);

  // The mobile stack follows the desktop reading order
  const stacked = useMemo(() => {
    const lg = state?.layouts.lg ?? [];
    const order = (id: WidgetId) => {
      const item = lg.find((entry) => entry.i === id);
      return item ? item.y * 1000 + item.x : Number.MAX_SAFE_INTEGER;
    };
    return [...visibleWidgets].sort((a, b) => order(a.id) - order(b.id));
  }, [visibleWidgets, state]);

  const renderWidget = (widget: WidgetDefinition) => {
    const Widget = widget.component;
    return (
      <DashboardWidget
        title={widget.title ?? t(widget.titleKey)}
        editMode={editing}
        onHide={() => setVisible(widget.id, false)}
        contentClassName={widget.contentClassName}
      >
        <Widget />
      </DashboardWidget>
    );
  };

  return (
    <div className="stagger-enter">
      <DashboardHeader />

      {!isMobile && (
        <TopbarActions>
          {editing && hiddenWidgets.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                <Plus />
                {t("toolbar.addWidget")}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {hiddenWidgets.map((widget) => (
                  <DropdownMenuItem key={widget.id} onClick={() => setVisible(widget.id, true)}>
                    <widget.icon />
                    {widget.title ?? t(widget.titleKey)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {editing && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw />
              {t("toolbar.reset")}
            </Button>
          )}
          <Button variant={editing ? "default" : "ghost"} size="sm" onClick={() => setEditMode((v) => !v)}>
            <Pencil />
            {editing ? t("toolbar.done") : t("toolbar.edit")}
          </Button>
        </TopbarActions>
      )}

      <DashboardStats />
      <ExtensionSlot name="dashboard.header" />

      {/* Always mounted, the width observer attaches to this node once on mount */}
      <div ref={containerRef} className="mt-4">
        {isMobile ? (
          <div className="flex flex-col gap-4">
            {stacked.map((widget) => (
              <div key={widget.id} className="min-h-64">
                {renderWidget(widget)}
              </div>
            ))}
          </div>
        ) : isLoading || !state || !mounted ? (
          <Skeleton className="h-96 rounded-lg" />
        ) : (
          <ResponsiveGridLayout
            width={width}
            breakpoints={DASHBOARD_BREAKPOINTS}
            cols={DASHBOARD_COLS}
            rowHeight={DASHBOARD_ROW_HEIGHT}
            layouts={layouts}
            margin={[GRID_GAP, GRID_GAP]}
            containerPadding={[0, 0]}
            dragConfig={{ enabled: editing, handle: ".dashboard-drag-handle", cancel: "button, a" }}
            resizeConfig={{ enabled: editing }}
            onLayoutChange={(_layout, allLayouts) => editing && setLayouts(allLayouts)}
          >
            {visibleWidgets.map((widget) => (
              <div key={widget.id}>{renderWidget(widget)}</div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>
    </div>
  );
}
