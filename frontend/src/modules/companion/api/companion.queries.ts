import { api, type CompanionEventType, type CompanionMaintenanceRequest, type CompanionMetricsWindow, type CompanionOverview, type CompanionSettings, type CompanionTitleRequest } from "@/api";
import { qk } from "@/shared/queries/query-keys";
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useCompanionOverview(serverId: string | undefined) {
  return useQuery({
    queryKey: qk.companion.overview(serverId ?? ""),
    queryFn: () => api.companion.getOverview(serverId!),
    enabled: !!serverId,
    // Release info is cached on the panel, the live part comes over the socket
    staleTime: 30_000,
    meta: { silent: true },
  });
}

export function useCompanionMetrics(serverId: string | undefined, window: CompanionMetricsWindow, enabled = true) {
  return useQuery({
    queryKey: qk.companion.metrics(serverId ?? "", window),
    queryFn: () => api.companion.getMetrics(serverId!, window),
    enabled: enabled && !!serverId,
    refetchInterval: window === "1h" ? 15_000 : 60_000,
  });
}

const EVENTS_PAGE = 50;

export function useCompanionEvents(serverId: string | undefined, types: CompanionEventType[], q = "", enabled = true) {
  return useInfiniteQuery({
    queryKey: qk.companion.events(serverId ?? "", types.join(","), q),
    queryFn: ({ pageParam }) => api.companion.getEvents(serverId!, { types, q: q || undefined, before: pageParam, limit: EVENTS_PAGE }),
    placeholderData: keepPreviousData,
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (page) => page.nextBefore ?? undefined,
    enabled: enabled && !!serverId,
    refetchInterval: 15_000,
  });
}

export function useCompanionActivity(serverId: string | undefined, days: number, enabled = true) {
  return useQuery({
    queryKey: qk.companion.activity(serverId ?? "", days),
    queryFn: () => api.companion.getActivity(serverId!, days),
    enabled: enabled && !!serverId,
    refetchInterval: 60_000,
  });
}

/** On demand only, a scan of every entity is not something to poll */
export function useLagReportMutation(serverId: string) {
  return useMutation({ mutationFn: (limit?: number) => api.companion.getLagReport(serverId, limit) });
}

export function useInstallCompanionMutation(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.companion.install(serverId),
    // The caller toasts the error with its own title
    meta: { silent: true },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.companion.overview(serverId) });
      void queryClient.invalidateQueries({ queryKey: qk.plugins.installed(serverId) });
    },
  });
}

export function useCompanionSettingsMutation(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<CompanionSettings>) => api.companion.updateSettings(serverId, patch),
    // The caller toasts the error with its own title
    meta: { silent: true },
    onSuccess: (settings) =>
      queryClient.setQueryData<CompanionOverview>(qk.companion.overview(serverId), (old) => (old ? { ...old, settings } : old)),
  });
}

export function useCompanionMaintenanceMutation(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CompanionMaintenanceRequest) => api.companion.setMaintenance(serverId, data),
    // The caller toasts the error with its own title
    meta: { silent: true },
    onSuccess: (maintenance) =>
      queryClient.setQueryData<CompanionOverview>(qk.companion.overview(serverId), (old) => (old ? { ...old, maintenance } : old)),
  });
}

export function useBroadcastMutation(serverId: string) {
  return useMutation({ mutationFn: (message: string) => api.companion.broadcast(serverId, message), meta: { silent: true } });
}

export function useTitleMutation(serverId: string) {
  return useMutation({ mutationFn: (data: CompanionTitleRequest) => api.companion.title(serverId, data), meta: { silent: true } });
}
