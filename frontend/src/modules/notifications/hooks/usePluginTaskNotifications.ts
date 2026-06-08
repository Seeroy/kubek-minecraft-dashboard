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
        task.type === TaskType.PLUGIN_REMOVE
          ? t("modules.notifications.tasks.plugin.removing")
          : task.type === TaskType.PLUGIN_UPDATE
            ? t("modules.notifications.tasks.plugin.updating")
            : t("modules.notifications.tasks.plugin.installing");

      const successTitle =
        task.type === TaskType.PLUGIN_REMOVE
          ? `${pluginName} ${t("modules.notifications.tasks.plugin.removed")}`
          : `${pluginName} ${t("modules.notifications.tasks.plugin.ready")}`;

      const successMessage =
        task.message ??
        (task.type === TaskType.PLUGIN_REMOVE
          ? t("modules.notifications.tasks.plugin.removeMessage")
          : t("modules.notifications.tasks.plugin.installMessage"));

      applyTaskNotification(
        task,
        {
          inProgressTitle: `${actionLabel} ${pluginName}`,
          inProgressMessage:
            task.message ??
            `${actionLabel} ${t("modules.notifications.tasks.plugin.viaModrinth")}…`,
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
