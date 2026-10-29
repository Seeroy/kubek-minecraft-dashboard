import {
  Activity,
  Archive,
  Bell,
  Bot,
  Boxes,
  Container,
  FileText,
  KeyRound,
  LayoutDashboard,
  Package,
  PanelLeft,
  ShieldCheck,
  SquareTerminal,
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
