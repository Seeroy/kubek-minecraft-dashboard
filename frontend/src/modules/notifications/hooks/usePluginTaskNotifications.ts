import { useLanguageContext } from "@/shared/context/language-context";
import { type ITask, TaskType } from "@shared/types/task.types";
import { CheckCircle2, PlugZap } from "lucide-react";
import { useCallback } from "react";
import { applyTaskNotification } from "../utils/taskNotificationMachine";
import type { NotificationRegistry } from "./useNotificationRegistry";
import { useNotifications } from "./useNotifications";

/**
 * Notifications for plugin install / update / remove tasks
 */
const MOD_TASKS = new Set<TaskType>([TaskType.MOD_INSTALL, TaskType.MOD_UPDATE, TaskType.MOD_REMOVE]);

export function usePluginTaskNotifications(registry: NotificationRegistry) {
  const { notify, update, close } = useNotifications();
  const { t } = useLanguageContext();

  return useCallback(
    (task: ITask) => {
      const pluginName =
        task.meta?.pluginName ??
        task.meta?.pluginId ??
        task.meta?.serverName ??
        "Plugin";

      const actionLabel =
        task.type === TaskType.PLUGIN_REMOVE || task.type === TaskType.MOD_REMOVE
          ? t("modules.notifications.tasks.plugin.removing")
          : task.type === TaskType.PLUGIN_UPDATE || task.type === TaskType.MOD_UPDATE
            ? t("modules.notifications.tasks.plugin.updating")
            : t("modules.notifications.tasks.plugin.installing");

      const successTitle =
        task.type === TaskType.PLUGIN_REMOVE || task.type === TaskType.MOD_REMOVE
          ? `${pluginName} ${t("modules.notifications.tasks.plugin.removed")}`
          : `${pluginName} ${t("modules.notifications.tasks.plugin.ready")}`;

      const isMod = MOD_TASKS.has(task.type);
      const isRemove = task.type === TaskType.PLUGIN_REMOVE || task.type === TaskType.MOD_REMOVE;
      // task.message comes from the backend in English, so the copy stays local
      const successMessage = t(
        `modules.notifications.tasks.plugin.${isMod ? "mod" : ""}${isRemove ? "removeMessage" : "installMessage"}`
      );

      applyTaskNotification(
        task,
        {
          inProgressTitle: `${actionLabel} ${pluginName}`,
          inProgressMessage: `${actionLabel} ${t("modules.notifications.tasks.plugin.viaModrinth")}`,
          successTitle,
          successMessage,
          // The first-emit failed path and the update-existing failed path use
          // different i18n keys (failed vs failedSuffix); both are preserved
          failedTitle: `${pluginName} ${actionLabel.toLowerCase()} ${t("modules.notifications.tasks.plugin.failed")}`,
          failedTitleUpdate: `${pluginName} ${actionLabel.toLowerCase()} ${t("modules.notifications.tasks.plugin.failedSuffix")}`,
          errorMessage:
            task.error?.message ??
            t("modules.notifications.tasks.plugin.errorMessage"),
          icon: PlugZap,
          successIcon: CheckCircle2,
        },
        registry,
        { notify, update, close }
      );
    },
    [close, notify, registry, t, update]
  );
}
