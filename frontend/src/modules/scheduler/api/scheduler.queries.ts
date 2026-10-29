import { api, type CreateScheduledTaskRequest, type UpdateScheduledTaskRequest } from "@/api";
import { qk } from "@/shared/queries/query-keys";
import type { ScheduledRunStatus } from "@shared/types/scheduler.types";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useScheduledTasksByServer(serverId: string | undefined) {
  return useQuery({
    queryKey: qk.scheduler.tasksByServer(serverId ?? ""),
    queryFn: () => api.scheduler.list(serverId!),
    enabled: !!serverId,
  });
}

export function useTaskRunsByServer(serverId: string | undefined, filters: { taskId?: string; status?: ScheduledRunStatus } = {}) {
  return useQuery({
    queryKey: qk.scheduler.runsByServer(serverId ?? "", filters.taskId, filters.status),
    queryFn: () => api.scheduler.listRuns(serverId!, { ...filters, limit: 100 }),
    enabled: !!serverId,
    refetchInterval: 15_000,
    placeholderData: keepPreviousData,
  });
}

/** Next fire times, computed by the same cron engine the backend registers jobs with */
export function useCronPreview(expression: string, timezone: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.scheduler.cronPreview(expression, timezone),
    queryFn: () => api.scheduler.previewCron({ expression, timezone: timezone || undefined }),
    enabled: enabled && !!expression,
    staleTime: 60_000,
    retry: false,
    placeholderData: keepPreviousData,
  });
}

// Every change can move next and last runs, so both lists refresh together
function useInvalidateScheduler(serverId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.scheduler.tasksByServer(serverId) }),
      queryClient.invalidateQueries({ queryKey: qk.scheduler.runs(serverId) }),
    ]);
}

export function useCreateScheduledTaskMutation(serverId: string) {
  const onSuccess = useInvalidateScheduler(serverId);
  return useMutation({ mutationFn: (data: CreateScheduledTaskRequest) => api.scheduler.create(serverId, data), onSuccess });
}

export function useUpdateScheduledTaskMutation(serverId: string) {
  const onSuccess = useInvalidateScheduler(serverId);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScheduledTaskRequest }) => api.scheduler.update(id, data),
    onSuccess,
  });
}

export function useDeleteScheduledTaskMutation(serverId: string) {
  const onSuccess = useInvalidateScheduler(serverId);
  return useMutation({ mutationFn: (id: string) => api.scheduler.delete(id), onSuccess });
}

export function useToggleScheduledTaskMutation(serverId: string) {
  const onSuccess = useInvalidateScheduler(serverId);
  return useMutation({ mutationFn: (id: string) => api.scheduler.toggle(id), onSuccess });
}

export function useRunNowMutation(serverId: string) {
  const onSuccess = useInvalidateScheduler(serverId);
  return useMutation({ mutationFn: (id: string) => api.scheduler.runNow(id), onSuccess });
}
