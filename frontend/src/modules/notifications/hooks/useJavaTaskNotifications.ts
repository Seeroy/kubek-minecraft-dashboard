import { useLanguageContext } from "@/shared/context/language-context";
import type { ITask } from "@shared/types/task.types";
import { CheckCircle2 } from "lucide-react";
import { useCallback } from "react";
import { applyTaskNotification } from "../utils/taskNotificationMachine";
import type { NotificationRegistry } from "./useNotificationRegistry";
import { useNotifications } from "./useNotifications";

/**
 * Notifications for the java runtime install task
 */
export function useJavaTaskNotifications(registry: NotificationRegistry) {
  const { notify, update, close } = useNotifications();
  const { t } = useLanguageContext();

  return useCallback(
    (task: ITask) => {
      const javaVersion = task.meta?.javaVersion ?? "Java";
      const actionLabel = t("modules.notifications.tasks.java.installing");

      applyTaskNotification(
        task,
        {
          inProgressTitle: `${actionLabel} ${javaVersion}`,
          inProgressMessage:
            task.message ??
            `${actionLabel} ${t("modules.notifications.tasks.java.runtimeEllipsis")}`,
          successTitle: `${javaVersion} ${t("modules.notifications.tasks.java.installed")}`,
          successMessage:
            task.message ??
            t("modules.notifications.tasks.java.successMessage"),
          successMessageUpdate:
            task.message ??
            t("modules.notifications.tasks.plugin.installMessage"),
          failedTitle: `${javaVersion} ${t("modules.notifications.tasks.java.installFailed")}`,
          errorMessage:
            task.error?.message ??
            t("modules.notifications.tasks.java.errorMessage"),
          successIcon: CheckCircle2,
        },
        registry,
        { notify, update, close }
      );
    },
    [close, notify, registry, t, update]
  );
}
