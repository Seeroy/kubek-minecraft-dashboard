export const EXTENSION_TABS = ["installed", "catalog"] as const;
export type ExtensionTab = (typeof EXTENSION_TABS)[number];
