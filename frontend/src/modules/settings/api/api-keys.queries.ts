import { api, type CreateApiKeyDto, type UpdateApiKeyDto } from "@/api";
import { qk } from "@/shared/queries/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useApiKeys(scope: "own" | "all") {
  return useQuery({
    queryKey: qk.apiKeys.list(scope),
    queryFn: () => (scope === "all" ? api.apiKeys.listAll() : api.apiKeys.list()),
  });
}

export function useCreateApiKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateApiKeyDto) => api.apiKeys.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.apiKeys.all }),
  });
}

export function useUpdateApiKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateApiKeyDto }) => api.apiKeys.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.apiKeys.all }),
  });
}

export function useDeleteApiKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.apiKeys.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.apiKeys.all }),
  });
}

export function useMcpSettings() {
  return useQuery({ queryKey: qk.apiKeys.mcp(), queryFn: () => api.apiKeys.mcpSettings() });
}

export function useSetMcpMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => api.apiKeys.setMcpSettings({ enabled }),
    onSuccess: (data) => queryClient.setQueryData(qk.apiKeys.mcp(), data),
  });
}
