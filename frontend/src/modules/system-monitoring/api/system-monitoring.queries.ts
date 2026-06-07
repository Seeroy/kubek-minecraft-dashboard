import { api } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/shared/queries/query-keys";

export function useSystemMonitoringQuery() {
  return useQuery({
    queryKey: qk.systemMonitoring.combined(),
    queryFn: () => api.systemMonitoring.getCombinedMonitoringData(),
    refetchInterval: 5000,
  });
}
