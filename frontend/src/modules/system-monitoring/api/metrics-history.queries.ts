import { qk } from "@/shared/queries/query-keys";
import { useQuery } from "@tanstack/react-query";
import type { MetricsWindow } from "../types";
import { metricsHistoryApi } from "./metrics-history.api";

export function useMetricsHistoryQuery(
  scope: string | undefined,
  window: MetricsWindow
) {
  return useQuery({
    queryKey: qk.metricsHistory.range(scope ?? "", window),
    queryFn: () => metricsHistoryApi.range(scope!, window),
    enabled: !!scope,
    refetchInterval: window === "1h" ? 15_000 : 60_000,
  });
}
