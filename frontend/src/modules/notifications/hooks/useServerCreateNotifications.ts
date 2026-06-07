import { useServerStore } from "@/modules/server";
import { useLanguageContext } from "@/shared/context/language-context";
import type { ITask } from "@shared/types/task.types";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { resolveProgressMessage } from "../utils/resolveProgressMessage";
import { applyTaskNotification } from "../utils/taskNotificationMachine";
import type { NotificationRegistry } from "./useNotificationRegistry";
import { useNotifications } from "./useNotifications";

/**
 * Notifications for the server-create task
 */
export function useServerCreateNotifications(registry: NotificationRegistry) {
  const { notify, update, close } = useNotifications();
  const { selectServer } = useServerStore();
  const router = useRouter();
  const { t } = useLanguageContext();

  return useCallback(
    (task: ITask) => {
      const serverName =
        task.meta?.serverName ?? t("modules.notifications.tasks.server.server");
      const serverId =
        task.result?.serverId ?? task.meta?.serverId ?? undefined;

      applyTaskNotification(
        task,
        {
          inProgressTitle: `${t("modules.notifications.tasks.server.creating")} ${serverName}`,
          inProgressMessage: resolveProgressMessage(task, t),
          successTitle: `${serverName} ${t("modules.notifications.tasks.server.ready")}`,
          successMessage: t("modules.notifications.tasks.server.openMessage"),
          failedTitle: `${serverName} ${t("modules.notifications.tasks.server.createFailed")}`,
          errorMessage:
            task.error?.message ??
            t("modules.notifications.tasks.server.errorMessage"),
          successIcon: CheckCircle2,
          // Present only when a server id is known
          actions: (getNotifId) =>
            serverId !== undefined
              ? [
                  {
                    label: t("modules.notifications.tasks.server.openAction"),
                    onClick: () => {
                      if (serverId) {
                        selectServer(serverId);
                        if (typeof window !== "undefined") {
                          window.localStorage.setItem(
                            "selected_server_id",
                            serverId
                          );
                        }
                        router.push("/");
                      }
                      close(getNotifId());
                    },
                  },
                ]
              : undefined,
        },
        registry,
        { notify, update, close }
      );
    },
    [close, notify, registry, router, selectServer, t, update]
  );
}
