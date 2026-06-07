import { api, type UpdatePreferencesDto } from "@/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/queries/query-keys";

export function useTwofaStatusQuery() {
  return useQuery({
    queryKey: qk.twofa.status(),
    queryFn: () => api.twofa.status(),
  });
}

export function usePreferencesQuery() {
  return useQuery({
    queryKey: qk.twofa.preferences(),
    queryFn: () => api.twofa.getPreferences(),
  });
}

export function useSetupTotpMutation() {
  return useMutation({
    mutationFn: () => api.twofa.setupTotp(),
  });
}

export function useConfirmTotpMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { setupToken: string; code: string }) =>
      api.twofa.confirmTotp(vars.setupToken, vars.code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.twofa.status() });
    },
  });
}

export function useDisableTotpMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => api.twofa.disableTotp(password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.twofa.status() });
    },
  });
}

export function useEnableTelegramMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.twofa.enableTelegram(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.twofa.status() });
    },
  });
}

export function useDisableTelegramMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.twofa.disableTelegram(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.twofa.status() });
    },
  });
}

export function useUpdatePreferencesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePreferencesDto) =>
      api.twofa.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.twofa.preferences() });
    },
  });
}
