import { api } from "@/api";
import { qk } from "@/shared/queries/keys";
import type { AuditLogQuery } from "@shared/types/audit.types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export function useAuditLogsQuery(filters: AuditLogQuery) {
  return useQuery({
    queryKey: qk.auditLog.list(filters),
    queryFn: () => api.auditLog.query(filters),
    placeholderData: keepPreviousData,
    // Always refetch when user navigates back
    refetchOnMount: "always",
  });
}
