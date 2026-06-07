import { api } from "@/api";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/shared/queries/query-keys";

export function useProfileQuery() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: qk.auth.profile(),
    queryFn: () => api.auth.getProfile(),
    enabled: !!token,
    staleTime: 5 * 60_000,
    meta: { silent: true },
  });
}
