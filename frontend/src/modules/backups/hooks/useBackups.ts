import { api } from "@/api";
import { useNotificationsContext } from "@/modules/notifications";
import { useServerStore } from "@/modules/server";
import { useSocketApi } from "@/shared/context/socket-context";
import { useTranslation } from "@/shared/hooks/useTranslation";
import {
  useBackupsByServer,
  useDeleteBackupMutation,
  useRestoreBackupMutation,
} from "@/modules/backups/api/backups.queries";
import { qk } from "@/shared/queries/query-keys";
import { Backup } from "@shared/types/backup.types";
import {
  TaskStatus as TaskStatusEnum,
  TaskType,
} from "@shared/types/task.types";
import { WsTaskEventsTypes } from "@shared/types/ws/task-events.types";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { toBackup } from "../lib/backupAdapter";

export const useBackups = () => {
  const { t } = useTranslation("modules.backups");
  const { addNotification } = useNotificationsContext();
  const { selectedServer } = useServerStore();
  const { subscribe, unsubscribe } = useSocketApi();
  const queryClient = useQueryClient();

  const backupsQuery = useBackupsByServer(selectedServer?.id);
  const restoreMutation = useRestoreBackupMutation();
  const deleteMutation = useDeleteBackupMutation(selectedServer?.id);

  // The query returns the API BackupEntity; toBackup bridges it to the enum-rich shared Backup at this single boundary
  const backups = (backupsQuery.data ?? []).map(toBackup);
  const isLoading = backupsQuery.isLoading;

  const serverId = selectedServer?.id;

  const handleTaskEvent = useCallback(
    (task: any) => {
      if (!serverId) return;
      if (
        task.type !== TaskType.BACKUP_CREATE &&
        task.type !== TaskType.BACKUP_RESTORE &&
        task.type !== TaskType.BACKUP_DELETE
      ) {
        return;
      }
      if (
        task.status === TaskStatusEnum.PENDING ||
        task.status === TaskStatusEnum.RUNNING ||
        task.status === TaskStatusEnum.SUCCESS ||
        task.status === TaskStatusEnum.FAILED ||
        task.status === TaskStatusEnum.CANCELLED
      ) {
        queryClient.invalidateQueries({
          queryKey: qk.backups.byServer(serverId),
        });
      }
    },
    [serverId, queryClient]
  );

  useEffect(() => {
    const events = [
      WsTaskEventsTypes.TASK_UPDATE,
      WsTaskEventsTypes.TASK_DONE,
      WsTaskEventsTypes.TASK_FAILED,
    ] as const;

    events.forEach((event) => subscribe(event, handleTaskEvent));

    return () => {
      events.forEach((event) => unsubscribe(event, handleTaskEvent));
    };
  }, [handleTaskEvent, subscribe, unsubscribe]);

  const handleDownload = async (backup: Backup) => {
    try {
      const blob = await api.backups.downloadBackup(backup.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = backup.format === "tar.gz" ? "tar.gz" : "zip";
      a.download = `${backup.name}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      addNotification({
        title: t("notifications.downloadFailed"),
        message: t("notifications.downloadFailedMessage"),
        type: "error",
        duration: 5000,
      });
    }
  };

  const handleRestore = async (backup: Backup) => {
    try {
      await restoreMutation.mutateAsync(backup.id);
      addNotification({
        title: t("notifications.restoreStarted"),
        message: t("notifications.restoreStartedMessage", backup.name),
        type: "info",
        duration: 4000,
      });
    } catch (error) {
      addNotification({
        title: t("notifications.restoreFailed"),
        message:
          error instanceof Error
            ? error.message
            : t("notifications.restoreFailedMessage"),
        type: "error",
        duration: 5000,
      });
    }
  };

  const handleDelete = async (backup: Backup) => {
    try {
      await deleteMutation.mutateAsync(backup.id);
      addNotification({
        title: t("notifications.deleteStarted"),
        message: t("notifications.deleteStartedMessage", backup.name),
        type: "info",
        duration: 4000,
      });
    } catch (error) {
      addNotification({
        title: t("notifications.deleteFailed"),
        message:
          error instanceof Error
            ? error.message
            : t("notifications.deleteFailedMessage"),
        type: "error",
        duration: 5000,
      });
    }
  };

  return {
    backups,
    isLoading,
    loadBackups: backupsQuery.refetch,
    handleDownload,
    handleRestore,
    handleDelete,
  };
};
