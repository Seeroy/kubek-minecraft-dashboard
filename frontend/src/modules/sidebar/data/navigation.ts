import { UserPermissions } from "@shared/types/user.types";
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
} from "lucide-react";

// Primary navigation shown in the main list
export const navigation = [
  {
    nameKey: "navigation.dashboard",
    href: "/",
    icon: LayoutDashboard,
    permission: null,
  },
  {
    nameKey: "navigation.console",
    href: "/console",
    icon: Terminal,
    permission: null,
  },
  {
    nameKey: "navigation.files",
    href: "/files",
    icon: FolderOpen,
    permission: UserPermissions.FILE_MANAGER,
  },
  {
    nameKey: "navigation.serverSettings",
    href: "/server-settings",
    icon: Settings,
    permission: UserPermissions.SERVERS_CONFIGURE,
  },
  {
    nameKey: "navigation.panelSettings",
    href: "/panel-settings",
    icon: Sliders,
    permission: UserPermissions.KUBEK_SETTINGS,
  },
  {
    nameKey: "navigation.plugins",
    href: "/plugins",
    icon: Puzzle,
    permission: UserPermissions.MANAGE_PLUGINS,
  },
  {
    nameKey: "navigation.mods",
    href: "/mods",
    icon: Boxes,
    permission: UserPermissions.MANAGE_PLUGINS,
  },
  {
    nameKey: "navigation.backups",
    href: "/backups",
    icon: Database,
    permission: UserPermissions.BACKUPS,
  },
  {
    nameKey: "navigation.scheduler",
    href: "/scheduler",
    icon: CalendarClock,
    permission: UserPermissions.SCHEDULER_MANAGEMENT,
  },
];

// Secondary items grouped under a collapsible "Administration" section
export const adminNavigation = [
  {
    nameKey: "navigation.auditLog",
    href: "/audit-log",
    icon: ScrollText,
    permission: UserPermissions.AUDIT_LOG,
  },
  {
    nameKey: "navigation.systemMonitoring",
    href: "/system-monitoring",
    icon: Activity,
    permission: UserPermissions.SYSTEM_MONITORING,
  },
  {
    nameKey: "navigation.logViewer",
    href: "/logs",
    icon: FileText,
    permission: UserPermissions.FILE_MANAGER,
  },
  {
    nameKey: "navigation.serverTypes",
    href: "/server-types",
    icon: Package,
    permission: UserPermissions.KUBEK_SETTINGS,
  },
  {
    nameKey: "navigation.extensions",
    href: "/extensions",
    icon: Blocks,
    permission: UserPermissions.KUBEK_SETTINGS,
  },
  {
    nameKey: "navigation.javaManager",
    href: "/java",
    icon: Cpu,
    permission: UserPermissions.MANAGE_JAVA,
  },
];

// Combined list for lookups (current-page resolution, loading skeleton)
export const allNavigation = [...navigation, ...adminNavigation];

export type NavItem = (typeof allNavigation)[number];
