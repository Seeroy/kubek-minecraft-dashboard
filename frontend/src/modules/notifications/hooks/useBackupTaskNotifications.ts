import { useLanguageContext } from "@/shared/context/language-context";
import { type ITask, TaskType } from "@shared/types/task.types";
import { CheckCircle2 } from "lucide-react";
import { useCallback } from "react";
import { applyTaskNotification } from "../utils/taskNotificationMachine";
import type { NotificationRegistry } from "./useNotificationRegistry";
import { useNotifications } from "./useNotifications";

const KEYS = "modules.notifications.tasks.backup";

// Locale key stems per task: <stem>InProgressTitle, <done>Title, <stem>FailedTitle
const TITLES: Partial<Record<TaskType, { stem: string; done: string }>> = {
  [TaskType.BACKUP_CREATE]: { stem: "create", done: "created" },
  [TaskType.BACKUP_RESTORE]: { stem: "restore", done: "restored" },
  [TaskType.BACKUP_DELETE]: { stem: "delete", done: "deleted" },
  [TaskType.BACKUP_UPLOAD]: { stem: "upload", done: "uploaded" },
};

/**
 * Notifications for backup create / restore / delete / upload tasks
 */
export function useBackupTaskNotifications(registry: NotificationRegistry) {
  const { notify, update, close } = useNotifications();
  const { t } = useLanguageContext();

  return useCallback(
    (task: ITask) => {
      const titles = TITLES[task.type];
      if (!titles) return;
      const serverName = task.meta?.serverName ?? "Backup";

      applyTaskNotification(
        task,
        {
          inProgressTitle: t(`${KEYS}.${titles.stem}InProgressTitle`, serverName),
          inProgressMessage: task.message ?? t(`${KEYS}.inProgressMessage`),
          successTitle: t(`${KEYS}.${titles.done}Title`, serverName),
          successMessage: task.type === TaskType.BACKUP_DELETE ? t(`${KEYS}.deleteMessage`) : t(`${KEYS}.successMessage`),
          failedTitle: t(`${KEYS}.${titles.stem}FailedTitle`, serverName),
          errorMessage: task.error?.message ?? t(`${KEYS}.errorMessage`),
          successIcon: CheckCircle2,
        },
        registry,
        { notify, update, close }
      );
    },
    [close, notify, registry, t, update]
  );
}
