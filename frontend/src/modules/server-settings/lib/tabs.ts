import type { SettingsTab } from "./schema";

export const SERVER_SETTINGS_TABS = [
  "general",
  "java",
  "information",
  "gameplay",
  "world",
  "network",
  "other",
  "velocity",
] as const satisfies readonly SettingsTab[];
