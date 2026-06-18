import {
  Boxes,
  Container,
  PanelLeft,
  SquareTerminal,
  Upload,
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
