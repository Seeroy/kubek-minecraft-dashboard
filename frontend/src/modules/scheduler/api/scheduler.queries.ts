import {
  api,
  type CreateScheduledTaskRequest,
  type UpdateScheduledTaskRequest,
} from "@/api";
import type { ScheduledRunStatus } from "@shared/types/scheduler.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/queries/query-keys";

export function useScheduledTasksByServer(serverId: string | undefined) {
  return useQuery({
    queryKey: qk.scheduler.tasksByServer(serverId ?? ""),
    queryFn: () => api.scheduler.list(serverId!),
    enabled: !!serverId,
  });
}

export function useTaskRunsByServer(
  serverId: string | undefined,
  filters: { taskId?: string; status?: ScheduledRunStatus } = {}
) {
  return useQuery({
    queryKey: qk.scheduler.runsByServer(
      serverId ?? "",
      filters.taskId,
      filters.status
    ),
    queryFn: () =>
      api.scheduler.listRuns(serverId!, { ...filters, limit: 100 }),
    enabled: !!serverId,
    refetchInterval: 15_000,
  });
}

export function useCreateScheduledTaskMutation(serverId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateScheduledTaskRequest) =>
      api.scheduler.create(serverId!, data),
    onSuccess: () => {
      if (serverId) {
        queryClient.invalidateQueries({
          queryKey: qk.scheduler.tasksByServer(serverId),
        });
      }
    },
  });
}

export function useUpdateScheduledTaskMutation(serverId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateScheduledTaskRequest;
    }) => api.scheduler.update(id, data),
    onSuccess: () => {
      if (serverId) {
        queryClient.invalidateQueries({
          queryKey: qk.scheduler.tasksByServer(serverId),
        });
      }
    },
  });
}

export function useDeleteScheduledTaskMutation(serverId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.scheduler.delete(id),
    onSuccess: () => {
      if (serverId) {
        queryClient.invalidateQueries({
          queryKey: qk.scheduler.tasksByServer(serverId),
        });
      }
    },
  });
}

export function useToggleScheduledTaskMutation(serverId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.scheduler.toggle(id),
    onSuccess: () => {
      if (serverId) {
        queryClient.invalidateQueries({
          queryKey: qk.scheduler.tasksByServer(serverId),
        });
      }
    },
  });
}

export function useRunNowMutation(serverId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.scheduler.runNow(id),
    onSuccess: () => {
      if (serverId) {
        queryClient.invalidateQueries({
          queryKey: qk.scheduler.tasksByServer(serverId),
        });
        queryClient.invalidateQueries({
          queryKey: qk.scheduler.runs(serverId),
        });
      }
    },
  });
}
