import { useCallback, useRef } from "react";

export interface NotificationRegistry {
  getId: (taskId: string) => string | undefined;
  setId: (taskId: string, notifId: string) => void;
  deleteId: (taskId: string) => void;
}

/**
 * Wraps a stable Map ref that links a task id to the id of the notification
 * currently representing it, so the same notification can be updated across
 * the task lifecycle instead of spawning duplicates
 */
export function useNotificationRegistry(): NotificationRegistry {
  const notificationIds = useRef<Map<string, string>>(new Map());

  const getId = useCallback(
    (taskId: string) => notificationIds.current.get(taskId),
    []
  );

  const setId = useCallback((taskId: string, notifId: string) => {
    notificationIds.current.set(taskId, notifId);
  }, []);

  const deleteId = useCallback((taskId: string) => {
    notificationIds.current.delete(taskId);
  }, []);

  return { getId, setId, deleteId };
}
