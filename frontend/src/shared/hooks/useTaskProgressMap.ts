"use client";
import { useSocketApi } from "@/shared/context/socket-context";
import { isTaskActive } from "@/shared/lib/task-status";
import type { ITask, TaskMeta, TaskType } from "@shared/types/task.types";
import { WsTaskEventsTypes } from "@shared/types/ws/task-events.types";
import { useEffect, useEffectEvent, useRef, useState } from "react";

interface TaskProgressOptions<T> {
  /** Extra filter, e.g. one server */
  match?: (task: ITask) => boolean;
  /** Stored value for an active task */
  value: (task: ITask) => T;
  /** After each event, first is true for a new key */
  onTask?: (task: ITask, state: { active: boolean; first: boolean }) => void;
}

/**
 * Progress of active tasks of one type by task.meta[metaKey],
 * removed when the task is done
 */
export function useTaskProgressMap<T>(
  type: TaskType,
  metaKey: keyof TaskMeta,
  { match, value, onTask }: TaskProgressOptions<T>
): Record<string, T> {
  const { subscribe, unsubscribe } = useSocketApi();
  const [progress, setProgress] = useState<Record<string, T>>({});
  const tracked = useRef(new Set<string>());

  const handle = useEffectEvent((task: ITask) => {
    const key = task.meta?.[metaKey];
    if (task.type !== type || typeof key !== "string" || !key) return;
    if (match && !match(task)) return;

    const active = isTaskActive(task);
    const first = !tracked.current.has(key);
    if (active) tracked.current.add(key);
    else tracked.current.delete(key);

    setProgress((prev) => {
      const next = { ...prev };
      if (active) next[key] = value(task);
      else delete next[key];
      return next;
    });
    onTask?.(task, { active, first });
  });

  useEffect(() => {
    const listener = (task: ITask) => handle(task);
    subscribe(WsTaskEventsTypes.TASK_UPDATE, listener);
    return () => unsubscribe(WsTaskEventsTypes.TASK_UPDATE, listener);
  }, [subscribe, unsubscribe]);

  return progress;
}
