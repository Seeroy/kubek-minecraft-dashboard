import type { AccessRequirement } from "@/shared/lib/access";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import type { Layout, ResponsiveLayouts } from "react-grid-layout";

export type BuiltinWidgetId = "servers" | "hostLoad" | "events";

// Built-ins plus extension widgets, whose id is ext:<extId>:<widgetId>
export type WidgetId = BuiltinWidgetId | (string & {});

export interface WidgetDefinition {
  id: WidgetId;
  titleKey: string;
  /** Already resolved title, wins over titleKey (extension widgets set this) */
  title?: string;
  icon: LucideIcon;
  component: ComponentType;
  /** Hidden entirely when the user lacks this access */
  access?: AccessRequirement;
  /** Default size and constraints used when (re)adding the widget */
  defaultLayout: Pick<Layout[number], "w" | "h" | "minW" | "minH">;
  /** Override the body padding, e.g. p-0 for edge to edge tables */
  contentClassName?: string;
}

export interface DashboardLayoutState {
  version: number;
  visible: Record<string, boolean>;
  layouts: ResponsiveLayouts;
}
