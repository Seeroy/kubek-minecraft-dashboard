"use client";
import { useSocketApi } from "@/shared/context/socket-context";
import { type ITask, TaskType } from "@shared/types/task.types";
import { WsTaskEventsTypes } from "@shared/types/ws/task-events.types";
import { useEffect } from "react";
import { useServerCreationStore } from "../store/server-creation.store";

/**
 * Mirrors SERVER_CREATE task events into the creation store so the create modal
 * can render staged progress that survives the modal being closed
 */
export function ServerCreationBridge() {
  const { subscribe, unsubscribe } = useSocketApi();
  const upsertFromTask = useServerCreationStore((s) => s.upsertFromTask);

  useEffect(() => {
    const handle = (task: ITask) => {
      if (task.type === TaskType.SERVER_CREATE) upsertFromTask(task);
    };
    const events = [
      WsTaskEventsTypes.TASK_UPDATE,
      WsTaskEventsTypes.TASK_DONE,
      WsTaskEventsTypes.TASK_FAILED,
    ] as const;

    events.forEach((event) => subscribe(event, handle));
    return () => events.forEach((event) => unsubscribe(event, handle));
  }, [subscribe, unsubscribe, upsertFromTask]);

  return null;
}
