import { useLanguageContext } from "@/shared/context/language-context";
import type { ITask } from "@shared/types/task.types";
import { CheckCircle2 } from "lucide-react";
import { useCallback } from "react";
import { resolveProgressMessage } from "../utils/resolveProgressMessage";
import { applyTaskNotification } from "../utils/taskNotificationMachine";
import type { NotificationRegistry } from "./useNotificationRegistry";
import { useNotifications } from "./useNotifications";

/**
 * Progress notifications for the change-core task
 */
export function useServerCoreChangeNotifications(
  registry: NotificationRegistry
) {
  const { notify, update, close } = useNotifications();
  const { t } = useLanguageContext();

  return useCallback(
    (task: ITask) => {
      const serverName =
        task.meta?.serverName ?? t("modules.notifications.tasks.server.server");

      applyTaskNotification(
        task,
        {
          inProgressTitle: `${t("modules.notifications.tasks.server.changingCore")} ${serverName}`,
          inProgressMessage: resolveProgressMessage(task, t),
          successTitle: `${serverName} ${t("modules.notifications.tasks.server.coreChanged")}`,
          successMessage: t(
            "modules.notifications.tasks.server.coreChangeMessage"
          ),
          failedTitle: `${serverName} ${t("modules.notifications.tasks.server.coreChangeFailed")}`,
          errorMessage:
            task.error?.message ??
            t("modules.notifications.tasks.server.coreChangeErrorMessage"),
          successIcon: CheckCircle2,
        },
        registry,
        { notify, update, close }
      );
    },
    [close, notify, registry, t, update]
  );
}
