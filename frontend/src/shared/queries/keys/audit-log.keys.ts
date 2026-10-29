import type { AuditLogQuery, AuditRetention } from "@shared/types/audit.types";

export const auditLogKeys = {
  all: ["auditLogs"] as const,
  list: (filters: AuditLogQuery) => [...auditLogKeys.all, "list", filters] as const,
  retention: () => [...auditLogKeys.all, "retention"] as const,
  retentionPreview: (draft: AuditRetention | null) => [...auditLogKeys.all, "retention", "preview", draft] as const,
} as const;
