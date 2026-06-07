import type {
  Notification,
  NotificationAction,
} from "@/shared/types/notification.types";
import { type ITask, TaskStatus } from "@shared/types/task.types";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import type { NotificationRegistry } from "../hooks/useNotificationRegistry";

/**
 * Fully resolved copy for a single task event
 */
export interface TaskNotificationCopy {
  inProgressTitle: string;
  successTitle: string;
  failedTitle: string;
  /** Failed title used on the update-existing path; falls back to failedTitle */
  failedTitleUpdate?: string;
  inProgressMessage: string;
  successMessage: string;
  /** Success message used on the update-existing path; falls back to successMessage */
  successMessageUpdate?: string;
  errorMessage: string;
  /** Icon shown while the task is in progress (some families show none) */
  icon?: LucideIcon | string;
  /** Icon shown on success */
  successIcon?: LucideIcon | string;
  /**
   * Builds the success-notification actions. Receives a getter for the id of
   * the notification carrying the success so an action can dismiss it. The id
   * is read lazily because on the first-emit path it is not known until
   * notify() returns, mirroring the original closure-over-id behavior
   */
  actions?: (getNotifId: () => string) => NotificationAction[] | undefined;
}

export interface TaskNotificationApi {
  notify: (n: Omit<Notification, "id" | "createdAt">) => string;
  update: (id: string, data: Partial<Notification>) => void;
  close: (id: string) => void;
}

/**
 * Pure lifecycle driver shared by every task family
 */
export function applyTaskNotification(
  task: ITask,
  copy: TaskNotificationCopy,
  registry: NotificationRegistry,
  api: TaskNotificationApi
): void {
  const existingNotificationId = registry.getId(task.id);
  const isRunning =
    task.status === TaskStatus.PENDING || task.status === TaskStatus.RUNNING;
  const isFailed =
    task.status === TaskStatus.FAILED || task.status === TaskStatus.CANCELLED;

  // First emit while running: create a progress notification and remember it
  if (!existingNotificationId && isRunning) {
    const id = api.notify({
      title: copy.inProgressTitle,
      message: copy.inProgressMessage,
      type: "progress",
      icon: copy.icon,
      progress: task.progress ?? 0,
      duration: 0,
    });
    registry.setId(task.id, id);
    return;
  }

  // Terminal event with no progress notification ever created: emit a one-off
  if (!existingNotificationId) {
    if (task.status === TaskStatus.SUCCESS) {
      let id = "";
      id = api.notify({
        title: copy.successTitle,
        message: copy.successMessage,
        type: "success",
        icon: copy.successIcon,
        progress: copy.actions ? 100 : undefined,
        actions: copy.actions ? copy.actions(() => id) : undefined,
        duration: copy.actions ? 0 : 5000,
      });
      return;
    }

    if (isFailed) {
      api.notify({
        title: copy.failedTitle,
        message: copy.errorMessage,
        type: "error",
        icon: AlertTriangle,
        duration: 0,
      });
      return;
    }

    return;
  }

  // Update the existing progress notification through its remaining lifecycle
  switch (task.status) {
    case TaskStatus.PENDING:
    case TaskStatus.RUNNING: {
      api.update(existingNotificationId, {
        title: copy.inProgressTitle,
        message: copy.inProgressMessage,
        progress: task.progress ?? 0,
        type: "progress",
        icon: copy.icon,
        duration: 0,
      });
      break;
    }
    case TaskStatus.SUCCESS: {
      api.update(existingNotificationId, {
        title: copy.successTitle,
        message: copy.successMessageUpdate ?? copy.successMessage,
        progress: 100,
        type: "success",
        icon: copy.successIcon,
        actions: copy.actions
          ? copy.actions(() => existingNotificationId)
          : undefined,
        duration: copy.actions ? 0 : 5000,
      });
      registry.deleteId(task.id);
      break;
    }
    case TaskStatus.FAILED:
    case TaskStatus.CANCELLED: {
      api.update(existingNotificationId, {
        title: copy.failedTitleUpdate ?? copy.failedTitle,
        message: copy.errorMessage,
        progress: undefined,
        type: "error",
        icon: AlertTriangle,
        duration: 0,
      });
      registry.deleteId(task.id);
      break;
    }
  }
}
