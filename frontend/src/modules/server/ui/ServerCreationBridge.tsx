"use client";
import { api } from "@/api";
import { qk } from "@/shared/queries/query-keys";
import { emitToast } from "@/shared/lib/toast-bus";
import { useSocketApi } from "@/shared/context/socket-context";
import { type ITask, TaskStatus, TaskType } from "@shared/types/task.types";
import { WsTaskEventsTypes } from "@shared/types/ws/task-events.types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useServerCreationStore } from "../store/server-creation.store";

const CREATION_TASKS = new Set([TaskType.SERVER_CREATE, TaskType.SERVER_CREATE_MODPACK]);

/** Start a freshly created server once its task succeeds, if the wizard asked for it */
export function startIfRequested(taskId: string) {
  const { creations, autostart, setAutostart } = useServerCreationStore.getState();
  const creation = creations[taskId];
  if (!autostart[taskId] || !creation) return;
  if (creation.status === TaskStatus.FAILED || creation.status === TaskStatus.CANCELLED) setAutostart(taskId, false);
  if (creation.status !== TaskStatus.SUCCESS || !creation.serverId) return;
  setAutostart(taskId, false);
  api.servers.start(creation.serverId).catch((error: unknown) => {
    emitToast({ type: "error", title: error instanceof Error ? error.message : String(error) });
  });
}

/**
 * Mirrors server creation task events into the creation store so the create modal
 * can render staged progress that survives the modal being closed
 */
export function ServerCreationBridge() {
  const { subscribe, unsubscribe } = useSocketApi();
  const upsertFromTask = useServerCreationStore((s) => s.upsertFromTask);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handle = (task: ITask) => {
      if (!CREATION_TASKS.has(task.type)) return;
      upsertFromTask(task);
      startIfRequested(task.id);
      // The list may have asked for the icon before the install wrote it
      const serverId = task.meta?.serverId;
      if (task.status === TaskStatus.SUCCESS && serverId) {
        void queryClient.invalidateQueries({ queryKey: qk.servers.icon(serverId) });
      }
    };
    const events = [
      WsTaskEventsTypes.TASK_UPDATE,
      WsTaskEventsTypes.TASK_DONE,
      WsTaskEventsTypes.TASK_FAILED,
    ] as const;

    events.forEach((event) => subscribe(event, handle));
    return () => events.forEach((event) => unsubscribe(event, handle));
  }, [subscribe, unsubscribe, upsertFromTask, queryClient]);

  return null;
}
