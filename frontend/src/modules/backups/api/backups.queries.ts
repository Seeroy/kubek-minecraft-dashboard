import { api, type BackupPolicy, type BackupStorageInput, type CreateBackupRequest } from "@/api";
import { filesAdapter } from "@/modules/files/api/files.adapter";
import { qk } from "@/shared/queries/query-keys";
import { useAuthStore } from "@/shared/stores/auth-store";
import { AccessArea } from "@shared/access/areas";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useBackupsByServer(serverId: string | undefined) {
  return useQuery({
    queryKey: qk.backups.byServer(serverId ?? ""),
    queryFn: () => api.backups.getServerBackups(serverId!),
    enabled: !!serverId,
  });
}

/** Top level entries of the server root, offered for a partial backup */
export function useBackupFileScan(serverId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: qk.backups.fileScan(serverId ?? ""),
    queryFn: async () => (await api.files.scanDirectory(serverId!, "")).map(filesAdapter.toInternal),
    enabled: enabled && !!serverId,
    staleTime: 30_000,
  });
}

function useInvalidateBackups(serverId: string | undefined) {
  const queryClient = useQueryClient();
  return () => (serverId ? queryClient.invalidateQueries({ queryKey: qk.backups.byServer(serverId) }) : undefined);
}

export function useCreateBackupMutation(serverId: string | undefined) {
  const onSuccess = useInvalidateBackups(serverId);
  return useMutation({ mutationFn: (data: CreateBackupRequest) => api.backups.createBackup(data), onSuccess });
}

export function useRestoreBackupMutation() {
  // The caller explains a running server itself
  return useMutation({ mutationFn: (id: string) => api.backups.restoreBackup(id), meta: { silent: true } });
}

export function useDeleteBackupMutation(serverId: string | undefined) {
  const onSuccess = useInvalidateBackups(serverId);
  return useMutation({ mutationFn: (id: string) => api.backups.deleteBackup(id), onSuccess });
}

export function useUploadBackupMutation(serverId: string | undefined) {
  const onSuccess = useInvalidateBackups(serverId);
  return useMutation({ mutationFn: ({ id, storageId }: { id: string; storageId: string }) => api.backups.uploadBackup(id, storageId), onSuccess });
}

export function usePinBackupMutation(serverId: string | undefined) {
  const onSuccess = useInvalidateBackups(serverId);
  return useMutation({ mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => api.backups.setPinned(id, pinned), onSuccess });
}

export function useBackupJournal(serverId: string) {
  return useInfiniteQuery({
    queryKey: qk.backups.journal(serverId),
    queryFn: ({ pageParam }) => api.backups.getJournal(serverId, pageParam),
    initialPageParam: undefined as { createdAt: number; id: string } | undefined,
    // A full page means there may be older entries
    getNextPageParam: (page) => {
      const last = page.at(-1);
      return page.length === 50 && last ? { createdAt: last.createdAt, id: last.id } : undefined;
    },
  });
}

export function useBackupPolicy(serverId: string) {
  return useQuery({ queryKey: qk.backups.policy(serverId), queryFn: () => api.backups.getPolicy(serverId) });
}

export function useSavePolicyMutation(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (policy: BackupPolicy | null) => api.backups.setPolicy(serverId, policy),
    onSuccess: (saved) => queryClient.setQueryData(qk.backups.policy(serverId), saved),
  });
}

/** Copies the draft would delete, fetched only while there is a draft */
export function usePolicyPreview(serverId: string, draft: BackupPolicy | null) {
  return useQuery({
    queryKey: qk.backups.policyPreview(serverId, draft),
    queryFn: () => api.backups.previewPolicy(serverId, draft!),
    enabled: !!draft,
  });
}

export function useDefaultPolicy() {
  return useQuery({ queryKey: qk.backups.defaultPolicy(), queryFn: api.backups.getDefaultPolicy });
}

export function useSaveDefaultPolicyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (policy: BackupPolicy) => api.backups.setDefaultPolicy(policy),
    onSuccess: (saved) => {
      queryClient.setQueryData(qk.backups.defaultPolicy(), saved);
      // Servers without their own policy follow the defaults
      void queryClient.invalidateQueries({ queryKey: qk.backups.policies() });
    },
  });
}

export function useBackupStorages(enabled = true) {
  // Server backup screens read it too, without storages read the list stays empty
  const canRead = useAuthStore((s) => s.can(AccessArea.STORAGES, "read"));
  return useQuery({ queryKey: qk.backups.storages(), queryFn: api.backups.listStorages, enabled: enabled && canRead });
}

export function useSaveStorageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: BackupStorageInput }) => (id ? api.backups.updateStorage(id, input) : api.backups.createStorage(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.backups.storages() }),
  });
}

export function useDeleteStorageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.backups.deleteStorage(id),
    // The row explains a storage that still holds copies
    meta: { silent: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.backups.storages() }),
  });
}

export function useOrphanArchives() {
  return useQuery({ queryKey: qk.backups.orphans(), queryFn: api.backups.listOrphans });
}

export function useDeleteOrphansMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keys: string[]) => api.backups.deleteOrphans(keys),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.backups.orphans() }),
  });
}

export function useTestStorageMutation() {
  return useMutation({ mutationFn: ({ id, input }: { id?: string; input: BackupStorageInput }) => api.backups.testStorage(input, id), meta: { silent: true } });
}
