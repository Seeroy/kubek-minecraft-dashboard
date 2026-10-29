"use client";
import { useNotifications } from "@/modules/notifications";
import { useServerStore } from "@/modules/server";
import { useSocketApi } from "@/shared/context/socket-context";
import { qk } from "@/shared/queries/query-keys";
import type { NotificationType } from "@/shared/types/toast.types";
import type { INotification, NotificationSeverity, TaskNotificationParams } from "@shared/types/notification.types";
import { type ITask, TaskType } from "@shared/types/task.types";
import { WsNotificationEventTypes } from "@shared/types/ws/notification-events.types";
import { WsTaskEventsTypes } from "@shared/types/ws/task-events.types";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent } from "react";
import { useMarkReadMutation } from "../api/inbox.queries";
import { useDescribeNotification } from "../lib/describe";
import { useInboxPopover } from "../lib/inbox-popover";
import { passesToastLevel, readInboxToastLevel } from "../lib/toast-level";

const TOAST_MS = 8000;

const TOAST_TYPES: Record<NotificationSeverity, NotificationType> = {
  info: "info",
  success: "success",
  warning: "warning",
  error: "error",
};

// These task failures already get a toast from the task bridge or files runner
const TOASTED_TASKS = new Set<string>([
  TaskType.PLUGIN_INSTALL,
  TaskType.PLUGIN_UPDATE,
  TaskType.PLUGIN_REMOVE,
  TaskType.MOD_INSTALL,
  TaskType.MOD_UPDATE,
  TaskType.MOD_REMOVE,
  TaskType.BACKUP_CREATE,
  TaskType.BACKUP_RESTORE,
  TaskType.BACKUP_DELETE,
  TaskType.BACKUP_UPLOAD,
  TaskType.JAVA_INSTALL,
  TaskType.SERVER_CREATE,
  TaskType.SERVER_CREATE_MODPACK,
  TaskType.SERVER_CHANGE_CORE,
  TaskType.FILES_DELETE,
  TaskType.FILES_ARCHIVE,
  TaskType.FILES_EXTRACT,
]);

const BACKUP_TASKS = new Set<string>([TaskType.BACKUP_CREATE, TaskType.BACKUP_RESTORE, TaskType.BACKUP_UPLOAD]);
// Backup fail from a task we watched is already on screen
const WATCHED_BACKUP_MS = 10 * 60_000;

/** Kinds other notifiers already show, crashes and errors */
function toastedElsewhere(notification: INotification, watchedBackups: Map<string, number>) {
  switch (notification.kind) {
    case "server.crashed":
    case "server.error":
      return true;
    case "task.failed":
      return TOASTED_TASKS.has((notification.params as TaskNotificationParams).taskType);
    case "backup.failed": {
      const { serverId } = notification.params as INotification<"backup.failed">["params"];
      const seen = watchedBackups.get(serverId);
      return seen !== undefined && Date.now() - seen < WATCHED_BACKUP_MS;
    }
    default:
      return false;
  }
}

/** Refreshes the inbox on a new notification and shows a toast if the tab is open */
export function useInboxLiveUpdates() {
  const { subscribe, unsubscribe } = useSocketApi();
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const describe = useDescribeNotification();
  const markRead = useMarkReadMutation();
  const { selectServer } = useServerStore();
  const router = useRouter();

  const toast = useEffectEvent((notification: INotification, watchedBackups: Map<string, number>) => {
    // Background tab only gets the counter, and the open popover shows it anyway
    if (document.hidden || useInboxPopover.getState().open) return;
    if (!passesToastLevel(readInboxToastLevel(), notification.severity)) return;
    if (toastedElsewhere(notification, watchedBackups)) return;

    const view = describe(notification);
    const serverId = view.serverId;
    notify({
      title: view.title,
      message: view.description,
      type: TOAST_TYPES[notification.severity],
      icon: view.icon,
      duration: TOAST_MS,
      onClick: () => {
        if (!serverId) {
          useInboxPopover.getState().setOpen(true);
          return;
        }
        markRead.mutate(notification.id);
        selectServer(serverId);
        router.push(notification.kind === "backup.failed" ? "/backups" : "/console");
      },
    });
  });

  useEffect(() => {
    const watchedBackups = new Map<string, number>();

    const onNotification = (notification: INotification) => {
      void queryClient.invalidateQueries({ queryKey: qk.notifications.all });
      toast(notification, watchedBackups);
    };
    const onTask = (task: ITask) => {
      const serverId = task.meta?.serverId;
      if (serverId && BACKUP_TASKS.has(task.type)) watchedBackups.set(serverId, Date.now());
    };

    subscribe(WsNotificationEventTypes.NEW, onNotification);
    subscribe(WsTaskEventsTypes.TASK_UPDATE, onTask);
    return () => {
      unsubscribe(WsNotificationEventTypes.NEW, onNotification);
      unsubscribe(WsTaskEventsTypes.TASK_UPDATE, onTask);
    };
  }, [subscribe, unsubscribe, queryClient]);
}
