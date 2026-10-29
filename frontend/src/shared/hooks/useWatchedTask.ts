"use client";
import { api } from "@/api";
import { useSocketApi } from "@/shared/context/socket-context";
import { qk } from "@/shared/queries/query-keys";
import { toTask } from "@/shared/queries/tasks.adapter";
import { isTaskFinished } from "@/shared/lib/task-status";
import type { ITask } from "@shared/types/task.types";
import { WsTaskEventsTypes } from "@shared/types/ws/task-events.types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

export { isTaskFinished };

const POLL_MS = 3_000;

/** Promise of a finished task, fed by the socket with a slow poll as backup */
export function useTaskWaiter() {
  const { subscribe, unsubscribe } = useSocketApi();

  return useCallback(
    (taskId: string, onUpdate?: (task: ITask) => void) =>
      new Promise<ITask>((resolve, reject) => {
        const settle = (task: ITask) => {
          if (task.id !== taskId) return;
          if (!isTaskFinished(task)) {
            onUpdate?.(task);
            return;
          }
          unsubscribe(WsTaskEventsTypes.TASK_UPDATE, settle);
          clearInterval(timer);
          resolve(task);
        };
        const poll = () =>
          api.tasks.getOne(taskId).then(
            (entity) => settle(toTask(entity)),
            (error: unknown) => {
              unsubscribe(WsTaskEventsTypes.TASK_UPDATE, settle);
              clearInterval(timer);
              reject(error);
            }
          );
        const timer = setInterval(() => void poll(), POLL_MS);
        subscribe(WsTaskEventsTypes.TASK_UPDATE, settle);
      }),
    [subscribe, unsubscribe]
  );
}

/** One background task, socket updates land in the query cache */
export function useWatchedTask(taskId: string | null) {
  const { subscribe, unsubscribe } = useSocketApi();
  const qc = useQueryClient();

  useEffect(() => {
    if (!taskId) return;
    const onTask = (task: ITask) => {
      if (task.id === taskId) qc.setQueryData(qk.tasks.byId(taskId), task);
    };
    subscribe(WsTaskEventsTypes.TASK_UPDATE, onTask);
    return () => unsubscribe(WsTaskEventsTypes.TASK_UPDATE, onTask);
  }, [taskId, subscribe, unsubscribe, qc]);

  return useQuery({
    queryKey: qk.tasks.byId(taskId ?? ""),
    queryFn: async () => toTask(await api.tasks.getOne(taskId!)),
    enabled: !!taskId,
    // Socket events drive it, the poll covers a missed event
    refetchInterval: (query) => (isTaskFinished(query.state.data) ? false : 5_000),
  });
}
