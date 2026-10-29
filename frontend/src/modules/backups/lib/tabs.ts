export const BACKUP_TABS = ["list", "journal", "policy"] as const;
export type BackupTab = (typeof BACKUP_TABS)[number];
