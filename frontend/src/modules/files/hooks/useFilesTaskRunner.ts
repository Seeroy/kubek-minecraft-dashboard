"use client";
import { api } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useSocketApi } from "@/shared/context/socket-context";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { toTask } from "@/shared/queries/tasks.adapter";
import { ITask, TaskStatus } from "@shared/types/task.types";
import { WsTaskEventsTypes } from "@shared/types/ws/task-events.types";
import { useCallback, useEffect, useRef, useState } from "react";

export interface FilesTaskRunnerOptions {
  progressTitle: string;
  successTitle?: string;
  errorTitle?: string;
  onSuccess?: (task: ITask) => void;
  onError?: (task: ITask) => void;
}

export interface FilesTaskRunner {
  isRunning: boolean;
  progress: number | null;
  message: string | null;
  start: (taskId: string) => void;
}

export function useFilesTaskRunner(
  options: FilesTaskRunnerOptions
): FilesTaskRunner {
  const { notify, update, close } = useNotifications();
  const { t } = useTranslation("modules.files.notifications");
  const { subscribe, unsubscribe } = useSocketApi();

  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const trackedIdRef = useRef<string | null>(null);
  const toastIdRef = useRef<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const handleUpdate = useCallback(
    (task: ITask) => {
      if (!task || task.id !== trackedIdRef.current) return;
      setProgress(task.progress);
      setMessage(task.message ?? null);
      if (toastIdRef.current) {
        update(toastIdRef.current, {
          progress: task.progress,
          message: task.message,
        });
      }
    },
    [update]
  );

  const finalize = useCallback(
    (task: ITask, isSuccess: boolean) => {
      if (!task || task.id !== trackedIdRef.current) return;

      if (toastIdRef.current) {
        close(toastIdRef.current);
        toastIdRef.current = null;
      }

      if (isSuccess) {
        if (optionsRef.current.successTitle) {
          notify({ type: "success", title: optionsRef.current.successTitle });
        }
        optionsRef.current.onSuccess?.(task);
      } else {
        notify({
          type: "error",
          title: optionsRef.current.errorTitle || t("error.operationFailed"),
          message: task.error?.message,
        });
        optionsRef.current.onError?.(task);
      }

      trackedIdRef.current = null;
      setIsRunning(false);
      setProgress(null);
      setMessage(null);
    },
    [close, notify, t]
  );

  const handleDone = useCallback(
    (task: ITask) => {
      finalize(task, task.status === TaskStatus.SUCCESS);
    },
    [finalize]
  );

  const handleFailed = useCallback(
    (task: ITask) => {
      finalize(task, false);
    },
    [finalize]
  );

  useEffect(() => {
    subscribe(WsTaskEventsTypes.TASK_UPDATE, handleUpdate);
    subscribe(WsTaskEventsTypes.TASK_DONE, handleDone);
    subscribe(WsTaskEventsTypes.TASK_FAILED, handleFailed);

    return () => {
      unsubscribe(WsTaskEventsTypes.TASK_UPDATE, handleUpdate);
      unsubscribe(WsTaskEventsTypes.TASK_DONE, handleDone);
      unsubscribe(WsTaskEventsTypes.TASK_FAILED, handleFailed);
    };
  }, [handleUpdate, handleDone, handleFailed, subscribe, unsubscribe]);

  const start = useCallback(
    (taskId: string) => {
      trackedIdRef.current = taskId;
      setIsRunning(true);
      setProgress(0);
      setMessage(null);

      const id = notify({
        type: "progress",
        title: optionsRef.current.progressTitle,
        progress: 0,
        duration: 0,
      });
      toastIdRef.current = id;

      // Race recovery: a fast task can already be finished by the time we subscribe
      void (async () => {
        try {
          const task = toTask(await api.tasks.getOne(taskId));
          if (trackedIdRef.current !== taskId) return;
          if (task.status === TaskStatus.SUCCESS) {
            finalize(task, true);
            return;
          }
          if (
            task.status === TaskStatus.FAILED ||
            task.status === TaskStatus.CANCELLED
          ) {
            finalize(task, false);
            return;
          }
          // Still running - sync the latest known progress
          if (toastIdRef.current) {
            setProgress(task.progress);
            setMessage(task.message ?? null);
            update(toastIdRef.current, {
              progress: task.progress,
              message: task.message,
            });
          }
        } catch {
          // Network error or task already gone - keep listening for WS events
        }
      })();
    },
    [notify, update, finalize]
  );

  return { isRunning, progress, message, start };
}
