import { api, type ServerProcessStats, type ServerStatsResponse } from "@/api";
import { qk } from "@/shared/queries/query-keys";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useQuery } from "@tanstack/react-query";

const EMPTY = new Map<string, ServerProcessStats>();
// When sampling is off there is nothing to poll for, only notice it turning back on
const DISABLED_POLL_MS = 60_000;

// Stable reference so the map is rebuilt only when new data arrives
const toLookup = (data: ServerStatsResponse) => ({
  enabled: data.enabled,
  stats: new Map(data.servers.map((stats) => [stats.serverId, stats])),
});

/** Live CPU and memory of running servers keyed by server id, polled while the tab is visible */
export function useServerStatsQuery() {
  const canView = useAuthStore((s) => s.seesServers());
  const query = useQuery({
    queryKey: qk.systemMonitoring.serverStats(),
    queryFn: () => api.systemMonitoring.getServerStats(),
    select: toLookup,
    enabled: canView,
    refetchInterval: (q) => (q.state.data?.enabled === false ? DISABLED_POLL_MS : 5000),
    meta: { silent: true },
  });
  // Optimistic until the first answer so columns do not jump in on load
  return { enabled: query.data?.enabled ?? true, stats: query.data?.stats ?? EMPTY };
}
