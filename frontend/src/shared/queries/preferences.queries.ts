import { api, type UpdatePreferencesDto, type UserPreferences } from "@/api";
import { qk } from "@/shared/queries/query-keys";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/** GET accounts/me/preferences, the caller sets staleTime */
export function usePreferencesQuery(options: { staleTime?: number } = {}) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: qk.preferences.detail(),
    queryFn: () => api.preferences.get(),
    enabled: !!token,
    staleTime: options.staleTime,
  });
}

/** Only way to write, updates the cache right away and rolls back on error */
export function useUpdatePreferencesMutation(options: { silent?: boolean } = {}) {
  const queryClient = useQueryClient();
  const key = qk.preferences.detail();
  return useMutation({
    mutationFn: (data: UpdatePreferencesDto) => api.preferences.update(data),
    meta: options.silent ? { silent: true } : undefined,
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<UserPreferences>(key);
      queryClient.setQueryData<UserPreferences>(key, (prev) => prev && { ...prev, ...data });
      return { previous };
    },
    onError: (_error, _data, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (preferences) => queryClient.setQueryData(key, preferences),
  });
}
