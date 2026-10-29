import { api } from "@/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/queries/query-keys";

export function useTwofaStatusQuery() {
  return useQuery({
    queryKey: qk.twofa.status(),
    queryFn: () => api.twofa.status(),
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
    // A wrong code is shown under the field instead of a toast
    meta: { silent: true },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.twofa.status() });
    },
  });
}

export function useDisableTotpMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => api.twofa.disableTotp(password),
    meta: { silent: true },
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

// Preferences moved to shared, settings still imports them from here
export {
  usePreferencesQuery,
  useUpdatePreferencesMutation,
} from "@/shared/queries/preferences.queries";
