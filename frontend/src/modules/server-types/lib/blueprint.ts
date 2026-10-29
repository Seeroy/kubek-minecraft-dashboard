import type { Tone } from "@/shared/ui/tone";
import type { BlueprintFeature } from "@kubekpanel/blueprint-sdk";

export const FEATURE_TONE: Record<BlueprintFeature, Tone> = {
  console: "blue",
  backups: "cyan",
  files: "amber",
  players: "green",
  "plugins:modrinth": "purple",
  "mods:fabric": "orange",
};

// The bundled blueprint id suffix matches the core icon asset name (paper, purpur, ...)
export const iconType = (id: string) => id.split(".").pop() ?? "custom";
