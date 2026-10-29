// Panel settings tabs, each one is its own page: /panel-settings/<tab>
export const SETTINGS_TABS = ["general", "security", "telegram", "storages", "assistant", "users", "roles", "sessions", "twofa", "about"] as const;
export type SettingsTabId = (typeof SETTINGS_TABS)[number];

// Extension panels are unknown at build time, they share /panel-settings/ext?panel=<extId>:<id>
export const SETTINGS_EXT_TAB = "ext";
