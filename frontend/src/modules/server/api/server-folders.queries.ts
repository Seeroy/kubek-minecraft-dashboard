import type { CreateServerFolderProps, UpdateServerFolderProps } from "@/api";
import { api } from "@/api";
import { qk } from "@/shared/queries/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useServerFoldersQuery() {
  return useQuery({
    queryKey: qk.serverFolders.list(),
    queryFn: () => api.serverFolders.list(),
  });
}

export function useCreateFolderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateServerFolderProps) =>
      api.serverFolders.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.serverFolders.all }),
  });
}

export function useUpdateFolderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateServerFolderProps }) =>
      api.serverFolders.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.serverFolders.all }),
  });
}

export function useDeleteFolderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.serverFolders.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.serverFolders.all });
      qc.invalidateQueries({ queryKey: qk.servers.all });
    },
  });
}

export function useMoveServersMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      serverIds,
      folderId,
    }: {
      serverIds: string[];
      folderId: string | null;
    }) => api.serverFolders.move(serverIds, folderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.servers.all });
      qc.invalidateQueries({ queryKey: qk.serverFolders.all });
    },
  });
}
