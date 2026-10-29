// Shared by /plugins and /mods
export const CONTENT_TABS = ["installed", "available"] as const;
export type ContentTab = (typeof CONTENT_TABS)[number];
