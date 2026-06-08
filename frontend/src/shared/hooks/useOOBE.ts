import { useProfileQuery } from "@/modules/auth/api/auth.queries";

export function useOOBE() {
  const { data, isLoading, isFetching } = useProfileQuery();
  return {
    needsOOBE: data ? !data.oobeCompleted : null,
    isLoading: isLoading || isFetching,
  };
}
