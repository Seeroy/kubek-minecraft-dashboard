import { UserPermissions } from "@shared/types/user.types";
import {
  Activity,
  Cpu,
  LayoutGrid,
  MemoryStick,
  ServerCog,
  ShieldAlert,
} from "lucide-react";
import type { Layout } from "react-grid-layout";
import type {
  DashboardLayoutState,
  WidgetDefinition,
  WidgetId,
} from "../types/widget.types";
import AllServersWidget from "../ui/widgets/AllServersWidget";
import CpuChartWidget from "../ui/widgets/CpuChartWidget";
import DiagnosticsBackupsWidget from "../ui/widgets/DiagnosticsBackupsWidget";
import HostResourcesWidget from "../ui/widgets/HostResourcesWidget";
import RamChartWidget from "../ui/widgets/RamChartWidget";
import SelectedServerStatsWidget from "../ui/widgets/SelectedServerStatsWidget";

export const WIDGETS: WidgetDefinition[] = [
  {
    id: "allServers",
    titleKey: "widgets.allServers",
    icon: LayoutGrid,
    component: AllServersWidget,
    defaultLayout: { w: 2, h: 2, minW: 1, minH: 2 },
  },
  {
    id: "selectedServer",
    titleKey: "widgets.selectedServer",
    icon: ServerCog,
    component: SelectedServerStatsWidget,
    requiredPermission: UserPermissions.SERVERS_VIEW,
    defaultLayout: { w: 2, h: 2, minW: 1, minH: 2 },
  },
  {
    id: "hostResources",
    titleKey: "widgets.hostResources",
    icon: Activity,
    component: HostResourcesWidget,
    requiredPermission: UserPermissions.SYSTEM_MONITORING,
    defaultLayout: { w: 2, h: 2, minW: 1, minH: 1 },
  },
  {
    id: "diagnostics",
    titleKey: "widgets.diagnostics",
    icon: ShieldAlert,
    component: DiagnosticsBackupsWidget,
    requiredPermission: UserPermissions.SERVERS_VIEW,
    defaultLayout: { w: 2, h: 2, minW: 1, minH: 2 },
  },
  {
    id: "cpuChart",
    titleKey: "widgets.cpuChart",
    icon: Cpu,
    component: CpuChartWidget,
    requiredPermission: UserPermissions.SYSTEM_MONITORING,
    defaultLayout: { w: 2, h: 2, minW: 1, minH: 2 },
    bare: true,
  },
  {
    id: "ramChart",
    titleKey: "widgets.ramChart",
    icon: MemoryStick,
    component: RamChartWidget,
    requiredPermission: UserPermissions.SYSTEM_MONITORING,
    defaultLayout: { w: 2, h: 2, minW: 1, minH: 2 },
    bare: true,
  },
];

/** Default bento arrangement on the largest breakpoint; others are auto-generated */
function defaultLgLayout(): Layout {
  return [
    { i: "allServers", x: 0, y: 0, w: 2, h: 2, minW: 1, minH: 2 },
    { i: "selectedServer", x: 2, y: 0, w: 2, h: 2, minW: 1, minH: 2 },
    { i: "cpuChart", x: 0, y: 2, w: 2, h: 2, minW: 1, minH: 2 },
    { i: "ramChart", x: 2, y: 2, w: 2, h: 2, minW: 1, minH: 2 },
    { i: "hostResources", x: 0, y: 4, w: 2, h: 2, minW: 1, minH: 1 },
    { i: "diagnostics", x: 2, y: 4, w: 2, h: 2, minW: 1, minH: 2 },
  ];
}

export function defaultLayoutState(
  widgets: WidgetDefinition[] = WIDGETS
): DashboardLayoutState {
  const visible: Record<string, boolean> = {};
  for (const widget of widgets) visible[widget.id] = true;
  // Built-ins keep their bento positions; extras (extension widgets) get appended at the bottom
  const lg: Layout[number][] = [...defaultLgLayout()];
  for (const widget of widgets) {
    if (!lg.some((item) => item.i === widget.id))
      lg.push(defaultItemLayout(widget.id, widgets));
  }
  return { visible, layouts: { lg } };
}

export const DASHBOARD_BREAKPOINTS = { lg: 1024, md: 768, sm: 480, xs: 0 };
export const DASHBOARD_COLS = { lg: 4, md: 3, sm: 2, xs: 1 };
export const DASHBOARD_ROW_HEIGHT = 130;

/** Default size/constraints for a widget being (re)added to the grid */
export function defaultItemLayout(
  id: WidgetId,
  widgets: WidgetDefinition[] = WIDGETS
): Layout[number] {
  const def = widgets.find((w) => w.id === id);
  return {
    i: id,
    x: 0,
    y: Infinity,
    w: def?.defaultLayout.w ?? 2,
    h: def?.defaultLayout.h ?? 2,
    minW: def?.defaultLayout.minW,
    minH: def?.defaultLayout.minH,
  };
}
