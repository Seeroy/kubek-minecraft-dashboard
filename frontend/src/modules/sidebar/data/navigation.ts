import type { AccessRequirement } from "@/shared/lib/access";
import { AccessArea } from "@shared/access/areas";
import {
  Activity,
  Blocks,
  Boxes,
  CalendarClock,
  Cpu,
  Database,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Package,
  Puzzle,
  ScrollText,
  Settings,
  Sliders,
  Terminal,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  nameKey: string;
  href: string;
  icon: LucideIcon;
  access?: AccessRequirement;
}

// Primary navigation shown in the main list
export const navigation: NavItem[] = [
  {
    nameKey: "navigation.dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    nameKey: "navigation.console",
    href: "/console",
    icon: Terminal,
    access: [AccessArea.CONSOLE, "read"],
  },
  {
    nameKey: "navigation.files",
    href: "/files",
    icon: FolderOpen,
    access: [AccessArea.FILES, "read"],
  },
  {
    nameKey: "navigation.players",
    href: "/players",
    icon: UsersRound,
    access: [AccessArea.PLAYERS, "read"],
  },
  {
    nameKey: "navigation.serverSettings",
    href: "/server-settings",
    icon: Settings,
    access: [AccessArea.SETTINGS, "read"],
  },
  {
    nameKey: "navigation.plugins",
    href: "/plugins",
    icon: Puzzle,
    access: [AccessArea.CONTENT, "read"],
  },
  {
    nameKey: "navigation.mods",
    href: "/mods",
    icon: Boxes,
    access: [AccessArea.CONTENT, "read"],
  },
  {
    nameKey: "navigation.backups",
    href: "/backups",
    icon: Database,
    access: [AccessArea.BACKUPS, "read"],
  },
  {
    nameKey: "navigation.scheduler",
    href: "/scheduler",
    icon: CalendarClock,
    access: [AccessArea.SCHEDULER, "read"],
  },
];

// Secondary items grouped under a collapsible "Administration" section
export const adminNavigation: NavItem[] = [
  {
    nameKey: "navigation.panelSettings",
    href: "/panel-settings",
    icon: Sliders,
    // Opens when any of its tabs is open to the account
    access: {
      anyOf: [
        [AccessArea.PANEL, "manage"],
        [AccessArea.STORAGES, "read"],
        [AccessArea.ASSISTANT, "manage"],
        [AccessArea.ACCOUNTS, "read"],
      ],
    },
  },
  {
    nameKey: "navigation.auditLog",
    href: "/audit-log",
    icon: ScrollText,
    access: [AccessArea.AUDIT, "read"],
  },
  {
    nameKey: "navigation.systemMonitoring",
    href: "/system-monitoring",
    icon: Activity,
    access: [AccessArea.MONITORING, "read"],
  },
  {
    nameKey: "navigation.logViewer",
    href: "/logs",
    icon: FileText,
    access: [AccessArea.FILES, "read"],
  },
  {
    nameKey: "navigation.serverTypes",
    href: "/server-types",
    icon: Package,
    access: [AccessArea.INTEGRATIONS, "manage"],
  },
  {
    nameKey: "navigation.extensions",
    href: "/extensions",
    icon: Blocks,
    access: [AccessArea.INTEGRATIONS, "manage"],
  },
  {
    nameKey: "navigation.javaManager",
    href: "/java",
    icon: Cpu,
    access: [AccessArea.JAVA, "read"],
  },
];

// Routes that only make sense with a selected server
export const serverScopedRoutes = new Set([
  "/console",
  "/files",
  "/players",
  "/server-settings",
  "/plugins",
  "/mods",
  "/backups",
  "/scheduler",
]);

// Combined list for lookups (current-page resolution, loading skeleton)
export const allNavigation = [...navigation, ...adminNavigation];
