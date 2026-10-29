import { useProfileQuery } from "@/shared/queries/auth.queries";

export function useOOBE() {
  const { data, isLoading, isFetching } = useProfileQuery();
  return {
    needsOOBE: data ? !data.oobeCompleted : null,
    isLoading: isLoading || isFetching,
  };
}
