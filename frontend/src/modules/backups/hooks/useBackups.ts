"use client";
import { api } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useSocketApi } from "@/shared/context/socket-context";
import { useTaskProgressMap } from "@/shared/hooks/useTaskProgressMap";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAccess } from "@/shared/lib/access";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { ApiError } from "@/shared/lib/http/types";
import { confirmDialog } from "@/shared/modals";
import { qk } from "@/shared/queries/query-keys";
import { AccessArea } from "@shared/access/areas";
import { BackupCopyStatus, BackupFormat, type Backup } from "@shared/types/backup.types";
import { TaskType, type ITask } from "@shared/types/task.types";
import { WsTaskEventsTypes } from "@shared/types/ws/task-events.types";
import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect } from "react";
import { usePinBackupMutation, useDeleteBackupMutation, useRestoreBackupMutation, useUploadBackupMutation } from "../api/backups.queries";

const BACKUP_TASKS = new Set([TaskType.BACKUP_CREATE, TaskType.BACKUP_RESTORE, TaskType.BACKUP_DELETE, TaskType.BACKUP_UPLOAD]);

export interface BackupProgress {
  progress: number;
  message?: string;
}

/** Keeps the list live and tracks progress of backups being created */
export function useBackupTaskSync(serverId: string) {
  const { subscribe, unsubscribe } = useSocketApi();
  const queryClient = useQueryClient();

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: qk.backups.byServer(serverId) });
    void queryClient.invalidateQueries({ queryKey: qk.backups.journal(serverId) });
  }, [queryClient, serverId]);

  const progress = useTaskProgressMap<BackupProgress>(TaskType.BACKUP_CREATE, "backupId", {
    match: (task) => task.meta?.serverId === serverId,
    value: (task) => ({ progress: task.progress, message: task.message }),
    // Ticks only move the bar, the list reloads when a creation starts or ends
    onTask: (_task, { active, first }) => {
      if (!active || first) refresh();
    },
  });

  // Restore, delete and upload just reload the list
  useEffect(() => {
    const onTask = (task: ITask) => {
      if (!BACKUP_TASKS.has(task.type) || task.meta?.serverId !== serverId) return;
      if (task.type !== TaskType.BACKUP_CREATE || !task.meta?.backupId) refresh();
    };
    subscribe(WsTaskEventsTypes.TASK_UPDATE, onTask);
    return () => unsubscribe(WsTaskEventsTypes.TASK_UPDATE, onTask);
  }, [serverId, subscribe, unsubscribe, refresh]);

  return progress;
}

export function useBackupActions(serverId: string) {
  const { t } = useTranslation("modules.backups");
  const { notify } = useNotifications();
  const restoreMutation = useRestoreBackupMutation();
  const deleteMutation = useDeleteBackupMutation(serverId);
  const uploadMutation = useUploadBackupMutation(serverId);
  const pinMutation = usePinBackupMutation(serverId);
  // Upload and pin need write, restore and delete need manage
  const canWrite = useAccess([AccessArea.BACKUPS, "write"], serverId);
  const canManage = useAccess([AccessArea.BACKUPS, "manage"], serverId);

  // A backup that only lives in a storage is fetched from a signed link
  const download = async (backup: Backup) => {
    try {
      if (!hasLocalCopy(backup)) {
        // Opened before the await, a window opened later counts as a popup
        const tab = window.open("about:blank", "_blank");
        try {
          const url = await api.backups.downloadUrl(backup.id);
          if (tab) tab.location.href = url;
          else window.location.href = url;
        } catch (err) {
          tab?.close();
          throw err;
        }
        return;
      }
      const blob = await api.backups.downloadBackup(backup.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${backup.name}.${backup.format === BackupFormat.TAR_GZ ? "tar.gz" : "zip"}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      notify({ type: "error", title: t("notifications.downloadFailed") });
    }
  };

  // Progress and results arrive as task notifications, so the actions only ask and fire
  const restore = async (backup: Backup) => {
    const ok = await confirmDialog({
      title: t("confirm.restoreTitle", backup.name),
      description: t("confirm.restoreText"),
      confirmText: t("actions.restore"),
      cancelText: t("actions.cancel"),
      icon: RotateCcw,
    });
    if (!ok) return;
    restoreMutation.mutate(backup.id, {
      onError: (err) => {
        const running = err instanceof ApiError && err.code === "SERVER_RUNNING";
        notify(running ? { type: "warning", title: t("notifications.serverRunning") } : { type: "error", title: getApiErrorMessage(err) });
      },
    });
  };

  const remove = async (backup: Backup) => {
    const ok = await confirmDialog({
      title: t("confirm.deleteTitle", backup.name),
      description: t("confirm.deleteText", formatBytes(backup.totalSize)),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
      variant: "destructive",
      icon: Trash2,
    });
    if (ok) deleteMutation.mutate(backup.id);
  };

  const upload = (backup: Backup, storageId: string) =>
    uploadMutation.mutate({ id: backup.id, storageId }, { onSuccess: () => notify({ type: "info", title: t("upload.started") }) });

  const togglePin = (backup: Backup) => pinMutation.mutate({ id: backup.id, pinned: !backup.pinned });

  return { download, restore, remove, upload, togglePin, canWrite, canManage };
}

export const hasLocalCopy = (backup: Backup) => backup.copies.some((c) => c.storageId === null && c.status === BackupCopyStatus.READY);
