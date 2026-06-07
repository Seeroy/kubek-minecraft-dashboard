import { api, type BulkDeleteResult } from "@/api";
import { qk } from "@/shared/queries/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDuplicateServerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.servers.duplicate(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.servers.all }),
  });
}

export function useRenameServerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.servers.updateSettings(id, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.servers.all }),
  });
}

export function useDeleteServerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      password,
      confirmName,
    }: {
      id: string;
      password: string;
      confirmName: string;
    }) => api.servers.remove(id, { password, confirmName }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.servers.all }),
  });
}

export function useBulkDeleteServersMutation() {
  const qc = useQueryClient();
  return useMutation<
    BulkDeleteResult,
    Error,
    { ids: string[]; password: string }
  >({
    mutationFn: ({ ids, password }) => api.servers.bulkRemove(ids, password),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.servers.all }),
  });
}

export function useImportServerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ archive, name }: { archive: File; name?: string }) =>
      api.servers.importArchive(archive, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.servers.all }),
  });
}
