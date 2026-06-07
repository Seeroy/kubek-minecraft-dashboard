"use client";

import { api } from "@/api";
import { useSocketStore } from "@/shared/context/socket-context";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { NotificationAction } from "@/shared/types/notification.types";
import { InstanceLog_Error } from "@shared/types/server/instance.types";
import { WsServerEventTypes } from "@shared/types/ws/server-events.types";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useNotificationsContext } from "../contexts/NotificationProvider";

// Per-error suggested navigation; labels and notification text come from i18n
const ERROR_NAV_ACTIONS: Record<
  string,
  Array<{ key: string; href: string }>
> = {
  out_of_memory: [{ key: "goToServerSettings", href: "/server-settings" }],
  port_bind_failed: [{ key: "goToServerSettings", href: "/server-settings" }],
  world_corruption: [
    { key: "goToBackups", href: "/backups" },
    { key: "goToFiles", href: "/files" },
  ],
  plugin_error: [{ key: "goToPlugins", href: "/plugins" }],
  configuration_error: [
    { key: "goToServerSettings", href: "/server-settings" },
  ],
  java_version_incompatible: [
    { key: "goToServerSettings", href: "/server-settings" },
  ],
};

const KNOWN_ERROR_TYPES = new Set([
  "out_of_memory",
  "port_bind_failed",
  "world_corruption",
  "plugin_error",
  "disk_space",
  "network_error",
  "configuration_error",
  "java_version_incompatible",
  "file_permission_error",
  "mod_conflict",
  "server_unresponsive",
]);

/**
 * Global error notifier component
 * Listens to server error events and displays notifications with actions
 */
export const GlobalErrorNotifier = () => {
  const router = useRouter();
  const { socket, status, subscribe, unsubscribe } = useSocketStore();
  const { addNotification } = useNotificationsContext();
  const { t } = useTranslation("modules.notifications.globalErrorNotifier");
  const { t: td } = useTranslation("modules.diagnostics");

  useEffect(() => {
    if (status !== "connected" || !socket) return;

    const handleErrorUpdate = (
      data: InstanceLog_Error & { serverId: string; timestamp: string }
    ) => {
      const errorKey = KNOWN_ERROR_TYPES.has(data.errorType)
        ? data.errorType
        : "unknown";
      const title = td(`errors.${errorKey}.title`);
      const description = td(`errors.${errorKey}.description`);

      const getNotificationType = (severity: string) => {
        switch (severity) {
          case "critical":
          case "high":
            return "error";
          case "medium":
            return "warning";
          case "low":
          default:
            return "info";
        }
      };

      const navActions = ERROR_NAV_ACTIONS[data.errorType] ?? [];
      const actions: NotificationAction[] = navActions.map((action) => ({
        key: action.key,
        label: t(action.key),
        onClick: () => router.push(action.href),
      }));

      // For an unresponsive server, offer a one-click restart on the affected server
      if (data.errorType === "server_unresponsive") {
        actions.push({
          label: t("restart"),
          onClick: () => {
            void api.servers.restart(data.serverId);
          },
        });
      }

      addNotification({
        title,
        message: description,
        type: getNotificationType(data.severity),
        icon: AlertTriangle,
        duration: 8000, // Longer duration for errors
        actions,
      });
    };

    subscribe(WsServerEventTypes.ERROR_UPDATE, handleErrorUpdate);

    return () => {
      unsubscribe(WsServerEventTypes.ERROR_UPDATE, handleErrorUpdate);
    };
  }, [status, socket, subscribe, unsubscribe, addNotification, router]);

  return null; // This component doesn't render anything
};
