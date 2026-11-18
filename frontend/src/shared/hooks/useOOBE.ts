import { useProfileQuery } from "@/shared/queries/auth.queries";
import { useAuthStore } from "@/shared/stores/auth-store";

export function useOOBE() {
  const { data, isLoading, isFetching } = useProfileQuery();
  // Before hydration there's no token and the query looks idle
  const hydrated = useAuthStore((s) => s.isHydrated);
  return {
    needsOOBE: data ? !data.oobeCompleted : null,
    isLoading: !hydrated || isLoading || isFetching,
  };
}
