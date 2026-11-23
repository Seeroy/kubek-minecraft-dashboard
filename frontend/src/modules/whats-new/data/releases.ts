import {
  Activity,
  Archive,
  Bell,
  BellRing,
  Bot,
  Boxes,
  CalendarClock,
  Container,
  EyeOff,
  FileCog,
  FileDown,
  FileText,
  Gamepad2,
  Gauge,
  History,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  Package,
  Palette,
  PanelLeft,
  Plug,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  SquareTerminal,
  Store,
  Upload,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ReleaseHighlight {
  icon: LucideIcon;
  // i18n key under modules.whatsNew resolving to a single line
  titleKey: string;
}

export interface Release {
  version: string;
  highlights: ReleaseHighlight[];
}

// Curated highlights shown once after the panel updates to a given version
export const RELEASES: Release[] = [
  {
    version: "4.1.3",
    highlights: [
      { icon: Users, titleKey: "releases.4-1-3.players" },
      { icon: Plug, titleKey: "releases.4-1-3.companion" },
      { icon: Store, titleKey: "releases.4-1-3.catalog" },
      { icon: Bot, titleKey: "releases.4-1-3.assistant" },
      { icon: Palette, titleKey: "releases.4-1-3.theme" },
      { icon: EyeOff, titleKey: "releases.4-1-3.streamer" },
      { icon: SlidersHorizontal, titleKey: "releases.4-1-3.coreParams" },
      { icon: FileCog, titleKey: "releases.4-1-3.configFiles" },
      { icon: BellRing, titleKey: "releases.4-1-3.updates" },
      { icon: FileDown, titleKey: "releases.4-1-3.auditExport" },
    ],
  },
  {
    version: "4.1.2",
    highlights: [
      { icon: Boxes, titleKey: "releases.4-1-2.cores" },
      { icon: Gamepad2, titleKey: "releases.4-1-2.games" },
      { icon: KeyRound, titleKey: "releases.4-1-2.apiKeys" },
      { icon: Bot, titleKey: "releases.4-1-2.assistant" },
      { icon: Send, titleKey: "releases.4-1-2.telegram" },
      { icon: Package, titleKey: "releases.4-1-2.catalog" },
      { icon: ShieldCheck, titleKey: "releases.4-1-2.security" },
    ],
  },
  {
    version: "4.1.1",
    highlights: [
      { icon: Plug, titleKey: "releases.4-1-1.companion" },
      { icon: Gauge, titleKey: "releases.4-1-1.performance" },
      { icon: History, titleKey: "releases.4-1-1.activity" },
      { icon: MessageSquare, titleKey: "releases.4-1-1.messages" },
      { icon: CalendarClock, titleKey: "releases.4-1-1.schedule" },
      { icon: Bell, titleKey: "releases.4-1-1.alerts" },
      { icon: Bot, titleKey: "releases.4-1-1.assistant" },
      { icon: FileText, titleKey: "releases.4-1-1.agreement" },
    ],
  },
  {
    version: "4.1.0",
    highlights: [
      { icon: LayoutDashboard, titleKey: "releases.4-1-0.redesign" },
      { icon: Activity, titleKey: "releases.4-1-0.monitoring" },
      { icon: Bot, titleKey: "releases.4-1-0.assistant" },
      { icon: Archive, titleKey: "releases.4-1-0.backups" },
      { icon: KeyRound, titleKey: "releases.4-1-0.roles" },
      { icon: Users, titleKey: "releases.4-1-0.players" },
      { icon: Package, titleKey: "releases.4-1-0.modpacks" },
      { icon: Bell, titleKey: "releases.4-1-0.notifications" },
      { icon: ShieldCheck, titleKey: "releases.4-1-0.security" },
      { icon: FileText, titleKey: "releases.4-1-0.agreement" },
    ],
  },
  {
    version: "4.0.2",
    highlights: [
      { icon: Wrench, titleKey: "releases.4-0-2.windowsLaunch" },
    ],
  },
  {
    version: "4.0.1",
    highlights: [
      { icon: Container, titleKey: "releases.4-0-1.docker" },
      { icon: Boxes, titleKey: "releases.4-0-1.builtinCores" },
      { icon: SquareTerminal, titleKey: "releases.4-0-1.pty" },
      { icon: Upload, titleKey: "releases.4-0-1.customCore" },
      { icon: PanelLeft, titleKey: "releases.4-0-1.sidebar" },
    ],
  },
];

export function findRelease(version: string): Release | undefined {
  return RELEASES.find((r) => r.version === version);
}
