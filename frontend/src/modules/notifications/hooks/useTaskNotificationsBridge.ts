import { useSocketApi } from "@/shared/context/socket-context";
import { type ITask, TaskType } from "@shared/types/task.types";
import { WsTaskEventsTypes } from "@shared/types/ws/task-events.types";
import { useCallback, useEffect } from "react";
import { useBackupTaskNotifications } from "./useBackupTaskNotifications";
import { useJavaTaskNotifications } from "./useJavaTaskNotifications";
import { useNotificationRegistry } from "./useNotificationRegistry";
import { usePluginTaskNotifications } from "./usePluginTaskNotifications";
import { useServerCoreChangeNotifications } from "./useServerCoreChangeNotifications";
import { useServerCreateNotifications } from "./useServerCreateNotifications";

/**
 * Composes the per-family handlers, dispatches incoming task events by type and
 * keeps the socket subscription in sync for the task lifecycle
 */
export function useTaskNotificationsBridge() {
  const { subscribe, unsubscribe } = useSocketApi();

  const registry = useNotificationRegistry();
  const handlePluginTask = usePluginTaskNotifications(registry);
  const handleBackupTask = useBackupTaskNotifications(registry);
  const handleJavaTask = useJavaTaskNotifications(registry);
  const handleServerCreateTask = useServerCreateNotifications(registry);
  const handleServerCoreChangeTask = useServerCoreChangeNotifications(registry);

  const handleTaskEvent = useCallback(
    (task: ITask) => {
      switch (task.type) {
        case TaskType.PLUGIN_INSTALL:
        case TaskType.PLUGIN_UPDATE:
        case TaskType.PLUGIN_REMOVE:
        case TaskType.MOD_INSTALL:
        case TaskType.MOD_UPDATE:
        case TaskType.MOD_REMOVE:
          handlePluginTask(task);
          return;
        case TaskType.BACKUP_CREATE:
        case TaskType.BACKUP_RESTORE:
        case TaskType.BACKUP_DELETE:
          handleBackupTask(task);
          return;
        case TaskType.JAVA_INSTALL:
          handleJavaTask(task);
          return;
        case TaskType.SERVER_CREATE:
          handleServerCreateTask(task);
          return;
        case TaskType.SERVER_CHANGE_CORE:
          handleServerCoreChangeTask(task);
          return;
      }
    },
    [
      handleBackupTask,
      handleJavaTask,
      handlePluginTask,
      handleServerCreateTask,
      handleServerCoreChangeTask,
    ]
  );

  useEffect(() => {
    // TASK_UPDATE fires on every backend update, including the final SUCCESS /
    // FAILED transition, so it already drives the full notification lifecycle
    subscribe(WsTaskEventsTypes.TASK_UPDATE, handleTaskEvent);

    return () => {
      unsubscribe(WsTaskEventsTypes.TASK_UPDATE, handleTaskEvent);
    };
  }, [handleTaskEvent, subscribe, unsubscribe]);
}
