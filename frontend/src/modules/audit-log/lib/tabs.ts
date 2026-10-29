export const AUDIT_TABS = ["log", "retention"] as const;
export type AuditTab = (typeof AUDIT_TABS)[number];
