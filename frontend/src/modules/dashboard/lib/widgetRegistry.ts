import { AccessArea } from "@shared/access/areas";
import { CalendarClock, ChartArea, LayoutGrid } from "lucide-react";
import type { Layout } from "react-grid-layout";
import type { DashboardLayoutState, WidgetDefinition, WidgetId } from "../types/widget.types";
import EventsWidget from "../ui/widgets/EventsWidget";
import HostLoadWidget from "../ui/widgets/HostLoadWidget";
import ServersWidget from "../ui/widgets/ServersWidget";

export const WIDGETS: WidgetDefinition[] = [
  {
    id: "servers",
    titleKey: "widgets.servers",
    icon: LayoutGrid,
    component: ServersWidget,
    access: "serverView",
    contentClassName: "p-0",
    defaultLayout: { w: 4, h: 2, minW: 2, minH: 2 },
  },
  {
    id: "hostLoad",
    titleKey: "widgets.hostLoad",
    icon: ChartArea,
    component: HostLoadWidget,
    access: [AccessArea.MONITORING, "read"],
    defaultLayout: { w: 3, h: 3, minW: 2, minH: 2 },
  },
  {
    id: "events",
    titleKey: "widgets.events",
    icon: CalendarClock,
    component: EventsWidget,
    contentClassName: "p-0",
    defaultLayout: { w: 1, h: 3, minW: 1, minH: 2 },
  },
];

/** Default arrangement on the largest breakpoint, the others are generated */
function defaultLgLayout(): Layout {
  return [
    { i: "servers", x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
    { i: "hostLoad", x: 0, y: 2, w: 3, h: 3, minW: 2, minH: 2 },
    { i: "events", x: 3, y: 2, w: 1, h: 3, minW: 1, minH: 2 },
  ];
}

// Bumped when the widget set changes so saved layouts from older versions are dropped
export const LAYOUT_VERSION = 2;

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
  return { version: LAYOUT_VERSION, visible, layouts: { lg } };
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
