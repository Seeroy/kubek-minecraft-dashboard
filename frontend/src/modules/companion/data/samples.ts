import type { CompanionOverview, CompanionSettings } from "@/api";

export const SAMPLE_COMPANION_SETTINGS: { settings: CompanionSettings; maintenance: CompanionOverview["maintenance"] } = {
  settings: { sessions: true, kicks: true, deaths: true, chat: false, coords: false },
  maintenance: { enabled: false, message: "Server is under maintenance, back soon", motd: null, allow: [], allowOps: true },
};
