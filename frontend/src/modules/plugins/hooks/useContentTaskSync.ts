"use client";
import type { ContentKind } from "@/api";
import { useSocketApi } from "@/shared/context/socket-context";
import { qk } from "@/shared/queries/query-keys";
import { TaskStatus, type ITask } from "@shared/types/task.types";
import { WsTaskEventsTypes } from "@shared/types/ws/task-events.types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getContentKind } from "../content-kind";

/** Refetches the installed list once a background install, update or removal finishes */
export function useContentTaskSync(kind: ContentKind, serverId: string) {
  const { subscribe, unsubscribe } = useSocketApi();
  const queryClient = useQueryClient();

  useEffect(() => {
    const { taskTypes } = getContentKind(kind);
    const installedKey = (kind === "mod" ? qk.mods : qk.plugins).installed(serverId);
    const onTask = (task: ITask) => {
      if (!taskTypes.includes(task.type) || task.meta?.serverId !== serverId) return;
      if (task.status === TaskStatus.SUCCESS || task.status === TaskStatus.FAILED) {
        void queryClient.invalidateQueries({ queryKey: installedKey });
      }
    };
    subscribe(WsTaskEventsTypes.TASK_UPDATE, onTask);
    return () => unsubscribe(WsTaskEventsTypes.TASK_UPDATE, onTask);
  }, [kind, serverId, subscribe, unsubscribe, queryClient]);
}
