import { api } from "@/api";
import { qk } from "@/shared/queries/query-keys";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useQuery } from "@tanstack/react-query";

/**
 * Profile from the backend. The fetch also writes the auth store, it's used for
 * permission checks before this loads and by extensions
 */
export function useProfileQuery() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: qk.auth.profile(),
    queryFn: async () => {
      const profile = await api.auth.getProfile();
      // Logged out while loading, keep it that way
      if (useAuthStore.getState().token === token) {
        useAuthStore.getState().setUser(profile);
      }
      return profile;
    },
    enabled: !!token,
    staleTime: 5 * 60_000,
    meta: { silent: true },
  });
}
