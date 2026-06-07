import { api } from "@/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/queries/query-keys";

export function useSessions() {
  return useQuery({
    queryKey: qk.sessions.list(),
    queryFn: () => api.sessions.list(),
  });
}

export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.sessions.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.sessions.all });
    },
  });
}

export function useRevokeOtherSessionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.sessions.revokeAllExceptCurrent(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.sessions.all });
    },
  });
}
