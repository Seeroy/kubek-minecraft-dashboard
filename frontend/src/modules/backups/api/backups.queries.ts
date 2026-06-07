import { api, type CreateBackupRequest } from "@/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/queries/query-keys";

export function useBackupsByServer(serverId: string | undefined) {
  return useQuery({
    queryKey: qk.backups.byServer(serverId ?? ""),
    queryFn: () => api.backups.getServerBackups(serverId!),
    enabled: !!serverId,
  });
}

export function useCreateBackupMutation(serverId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBackupRequest) => api.backups.createBackup(data),
    onSuccess: () => {
      if (serverId) {
        queryClient.invalidateQueries({
          queryKey: qk.backups.byServer(serverId),
        });
      }
    },
  });
}

export function useRestoreBackupMutation() {
  return useMutation({
    mutationFn: (id: string) => api.backups.restoreBackup(id),
  });
}

export function useDeleteBackupMutation(serverId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.backups.deleteBackup(id),
    onSuccess: () => {
      if (serverId) {
        queryClient.invalidateQueries({
          queryKey: qk.backups.byServer(serverId),
        });
      }
    },
  });
}
