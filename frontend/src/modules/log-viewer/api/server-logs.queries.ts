import { qk } from "@/shared/queries/query-keys";
import { useQuery } from "@tanstack/react-query";
import { serverLogsApi } from "./server-logs.api";

export function useLogFilesQuery(serverId: string | undefined) {
  return useQuery({
    queryKey: qk.serverLogs.files(serverId ?? ""),
    queryFn: () => serverLogsApi.list(serverId!),
    enabled: !!serverId,
  });
}

export function useLogContentQuery(
  serverId: string | undefined,
  file: string | undefined,
  tail?: number
) {
  return useQuery({
    queryKey: [
      ...qk.serverLogs.content(serverId ?? "", file ?? ""),
      tail ?? null,
    ],
    queryFn: () => serverLogsApi.content(serverId!, file!, tail),
    enabled: !!serverId && !!file,
  });
}

export function useLogSearchQuery(
  serverId: string | undefined,
  file: string | undefined,
  q: string
) {
  return useQuery({
    queryKey: qk.serverLogs.search(serverId ?? "", file ?? "", q),
    queryFn: () => serverLogsApi.search(serverId!, file!, q),
    enabled: !!serverId && !!file && q.trim().length > 0,
  });
}
