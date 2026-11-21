import type { components, paths } from "../types";

export type AuditLogPage = components["schemas"]["AuditLogPageDto"];
export type AuditLogEntry = components["schemas"]["AuditLogEntryDto"];
export type AuditRetention = components["schemas"]["AuditRetentionDto"];
export type AuditRetentionState = components["schemas"]["AuditRetentionStateDto"];
export type AuditExportFormat = NonNullable<NonNullable<paths["/api/audit-logs/export"]["get"]["parameters"]["query"]>["format"]>;
export type AuditLogQuery = NonNullable<paths["/api/audit-logs"]["get"]["parameters"]["query"]>;
