"use client";

import { useAllServerStatuses, useServerStore } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Check, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useNotifications } from "../hooks/useNotifications";

type StatusType = "running" | "stopped" | "crashed" | string;

/**
 * Listens for server status changes and dispatches toast notifications
 * for important lifecycle events (started, stopped, crashed)
 */
export default function ServerStatusNotifier() {
  const { servers, selectServer } = useServerStore();
  const serverStatuses = useAllServerStatuses();
  const { notify } = useNotifications();
  const { t } = useTranslation("modules.notifications");

  const previousStatusesRef = useRef<Record<string, StatusType>>({});
  const initializedRef = useRef(false);

  const serverNames = useMemo(() => {
    const map: Record<string, string> = {};
    servers.forEach((server) => {
      map[server.id] = server.name ?? server.id;
    });
    return map;
  }, [servers]);

  useEffect(() => {
    const statusEntries = Object.entries(serverStatuses);

    if (statusEntries.length === 0) {
      previousStatusesRef.current = {};
      initializedRef.current = false;
      return;
    }

    statusEntries.forEach(([serverId, statusData]) => {
      const currentStatus = (
        statusData?.status || ""
      ).toLowerCase() as StatusType;
      if (!currentStatus) {
        return;
      }

      const previousStatus = previousStatusesRef.current[serverId];

      // During the first sync we only fill the cache without raising notifications
      if (!initializedRef.current || !previousStatus) {
        previousStatusesRef.current[serverId] = currentStatus;
        return;
      }

      if (previousStatus === currentStatus) {
        return;
      }

      previousStatusesRef.current[serverId] = currentStatus;

      const serverName = serverNames[serverId] ?? "Server";
      const baseNotification = {
        duration: 8000,
        icon: undefined,
      } as const;

      switch (currentStatus) {
        case "running":
          notify({
            ...baseNotification,
            title: t("serverStatus.startedTitle", serverName),
            message: t("serverStatus.started"),
            type: "success",
            icon: Check,
          });
          break;

        case "stopped":
          notify({
            ...baseNotification,
            title: t("serverStatus.stoppedTitle", serverName),
            message: t("serverStatus.stopped"),
            type: "info",
            icon: Check,
          });
          break;

        case "crashed":
          notify({
            ...baseNotification,
            title: t("serverStatus.crashedTitle", serverName),
            message: t("serverStatus.crashed.message"),
            type: "error",
            icon: TriangleAlert,
            actions: [
              {
                label: t("serverStatus.crashed.action"),
                onClick: () => {
                  selectServer(serverId);
                  window.location.href = "/";
                },
              },
            ],
            duration: 0,
          });
          break;

        default:
          break;
      }
    });

    initializedRef.current = true;
  }, [notify, serverStatuses, serverNames]);

  return null;
}
