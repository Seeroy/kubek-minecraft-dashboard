import type { AuditLogQuery } from "@shared/types/audit.types";

export const auditLogKeys = {
  all: ["auditLogs"] as const,
  list: (filters: AuditLogQuery) =>
    [...auditLogKeys.all, "list", filters] as const,
} as const;
