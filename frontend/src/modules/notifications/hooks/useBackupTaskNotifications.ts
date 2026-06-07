import { useLanguageContext } from "@/shared/context/language-context";
import { type ITask, TaskType } from "@shared/types/task.types";
import { CheckCircle2 } from "lucide-react";
import { useCallback } from "react";
import { applyTaskNotification } from "../utils/taskNotificationMachine";
import type { NotificationRegistry } from "./useNotificationRegistry";
import { useNotifications } from "./useNotifications";

/**
 * Notifications for backup create / restore / delete tasks
 */
export function useBackupTaskNotifications(registry: NotificationRegistry) {
  const { notify, update, close } = useNotifications();
  const { t } = useLanguageContext();

  return useCallback(
    (task: ITask) => {
      const backupName = task.meta?.serverName ?? "Backup";

      const inProgressTitle =
        task.type === TaskType.BACKUP_CREATE
          ? t(
              "modules.notifications.tasks.backup.createInProgressTitle",
              backupName
            )
          : task.type === TaskType.BACKUP_RESTORE
            ? t(
                "modules.notifications.tasks.backup.restoreInProgressTitle",
                backupName
              )
            : t(
                "modules.notifications.tasks.backup.deleteInProgressTitle",
                backupName
              );

      const successTitle =
        task.type === TaskType.BACKUP_CREATE
          ? t("modules.notifications.tasks.backup.createdTitle", backupName)
          : task.type === TaskType.BACKUP_RESTORE
            ? t("modules.notifications.tasks.backup.restoredTitle", backupName)
            : t("modules.notifications.tasks.backup.deletedTitle", backupName);

      const failedTitle =
        task.type === TaskType.BACKUP_CREATE
          ? t(
              "modules.notifications.tasks.backup.createFailedTitle",
              backupName
            )
          : task.type === TaskType.BACKUP_RESTORE
            ? t(
                "modules.notifications.tasks.backup.restoreFailedTitle",
                backupName
              )
            : t(
                "modules.notifications.tasks.backup.deleteFailedTitle",
                backupName
              );

      applyTaskNotification(
        task,
        {
          inProgressTitle,
          inProgressMessage:
            task.message ??
            t("modules.notifications.tasks.backup.inProgressMessage"),
          successTitle,
          successMessage:
            task.type === TaskType.BACKUP_DELETE
              ? t("modules.notifications.tasks.backup.deleteMessage")
              : t("modules.notifications.tasks.backup.successMessage"),
          failedTitle,
          errorMessage:
            task.error?.message ??
            t("modules.notifications.tasks.backup.errorMessage"),
          successIcon: CheckCircle2,
        },
        registry,
        { notify, update, close }
      );
    },
    [close, notify, registry, t, update]
  );
}
