import type { UserPermissions } from "@shared/types/user.types";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import type { Layout, ResponsiveLayouts } from "react-grid-layout";

export type BuiltinWidgetId =
  | "allServers"
  | "selectedServer"
  | "hostResources"
  | "diagnostics"
  | "cpuChart"
  | "ramChart";

// Built-ins plus extension widgets, whose id is ext:<extId>:<widgetId>
export type WidgetId = BuiltinWidgetId | (string & {});

export interface WidgetDefinition {
  id: WidgetId;
  titleKey: string;
  /** Already-resolved title, wins over titleKey (extension widgets set this) */
  title?: string;
  icon: LucideIcon;
  component: ComponentType;
  /** Hidden entirely when the user lacks this permission */
  requiredPermission?: UserPermissions;
  /** Default size/constraints used when (re)adding the widget */
  defaultLayout: Pick<Layout[number], "w" | "h" | "minW" | "minH">;
  /** Override the inner content padding (e.g. drop bottom padding so a
   *  decorative element can sit flush against the card's edge) */
  contentClassName?: string;
  /** Render the widget without the shared chrome (header bar, border).
   *  Drag / hide affordances are layered over the widget instead */
  bare?: boolean;
}

export interface DashboardLayoutState {
  visible: Record<string, boolean>;
  layouts: ResponsiveLayouts;
}
