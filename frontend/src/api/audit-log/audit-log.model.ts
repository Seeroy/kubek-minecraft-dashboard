import type { components, paths } from "../types";

export type AuditLogPage = components["schemas"]["AuditLogPageDto"];
export type AuditLogEntry = components["schemas"]["AuditLogEntryDto"];
export type AuditLogQuery = NonNullable<
  paths["/api/audit-logs"]["get"]["parameters"]["query"]
>;
