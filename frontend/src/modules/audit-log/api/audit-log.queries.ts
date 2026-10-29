import { api } from "@/api";
import { qk } from "@/shared/queries/keys";
import type { AuditLogQuery, AuditRetention } from "@shared/types/audit.types";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useAuditLogsQuery(filters: AuditLogQuery) {
  return useQuery({
    queryKey: qk.auditLog.list(filters),
    queryFn: () => api.auditLog.query(filters),
    placeholderData: keepPreviousData,
    // Always refetch when user navigates back
    refetchOnMount: "always",
  });
}

export function useAuditRetention(enabled = true) {
  return useQuery({ queryKey: qk.auditLog.retention(), queryFn: api.auditLog.getRetention, enabled });
}

export function useAuditRetentionPreview(draft: AuditRetention | null) {
  return useQuery({
    queryKey: qk.auditLog.retentionPreview(draft),
    queryFn: () => api.auditLog.previewRetention(draft!),
    enabled: !!draft,
  });
}

export function useSaveAuditRetention() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (retention: AuditRetention) => api.auditLog.setRetention(retention),
    // Saving prunes right away, the list and the totals change with it
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.auditLog.all }),
  });
}
