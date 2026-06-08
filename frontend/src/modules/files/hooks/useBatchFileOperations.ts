"use client";
import type { FilesSelection } from "@/modules/files/hooks/useFilesSelection";
import {
  useFilesTaskRunner,
  type FilesTaskRunner,
} from "@/modules/files/hooks/useFilesTaskRunner";
import { CREATE_ARCHIVE_MODAL_ID } from "@/modules/files/modals/CreateArchiveModal";
import { useNotifications } from "@/modules/notifications";
import type { Server } from "@/modules/server";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { confirmDialog } from "@/shared/modals";
import {
  useBatchDeleteFilesMutation,
  useCreateFilesArchiveMutation,
  useExtractFilesArchiveMutation,
} from "@/modules/files/api/files.queries";
import { useCallback } from "react";

interface BatchFileOperationsOptions {
  selectedServer: Server | null;
  currentPath: string;
  selection: FilesSelection;
  loadFiles: () => void;
}

export interface BatchFileOperations {
  isBatchBusy: boolean;
  activeRunner: FilesTaskRunner | null;
  handleBatchDelete: () => Promise<void>;
  handleOpenArchiveModal: () => void;
  // Exposed so single-file extract (useFileOperations) shares the same mutation + runner
  extractArchiveMutation: ReturnType<typeof useExtractFilesArchiveMutation>;
  extractRunner: FilesTaskRunner;
}

export function useBatchFileOperations({
  selectedServer,
  currentPath,
  selection,
  loadFiles,
}: BatchFileOperationsOptions): BatchFileOperations {
  const { t } = useTranslation("modules.files");
  const { notify } = useNotifications();
  const { open: openModal } = useModal();

  const batchDeleteMutation = useBatchDeleteFilesMutation(selectedServer?.id);
  const createArchiveMutation = useCreateFilesArchiveMutation(
    selectedServer?.id
  );
  const extractArchiveMutation = useExtractFilesArchiveMutation(
    selectedServer?.id
  );

  const deleteRunner = useFilesTaskRunner({
    progressTitle: t("notifications.progress.deleting"),
    successTitle: t("notifications.success.batchDeleted"),
    errorTitle: t("notifications.error.batchDelete"),
    onSuccess: () => {
      selection.clear();
      loadFiles();
    },
  });

  const archiveRunner = useFilesTaskRunner({
    progressTitle: t("notifications.progress.archiving"),
    successTitle: t("notifications.success.archiveCreated"),
    errorTitle: t("notifications.error.archiveCreate"),
    onSuccess: () => {
      selection.clear();
      loadFiles();
    },
  });

  const extractRunner = useFilesTaskRunner({
    progressTitle: t("notifications.progress.extracting"),
    successTitle: t("notifications.success.archiveExtracted"),
    errorTitle: t("notifications.error.archiveExtract"),
    onSuccess: () => {
      loadFiles();
    },
  });

  const isBatchBusy = deleteRunner.isRunning || archiveRunner.isRunning;
  const activeRunner = deleteRunner.isRunning
    ? deleteRunner
    : archiveRunner.isRunning
      ? archiveRunner
      : null;

  const handleBatchDelete = useCallback(async () => {
    if (!selectedServer || selection.count === 0) return;
    const ok = await confirmDialog({
      title: t("ui.files.delete.confirmManyTitle", { count: selection.count }),
      description: t("ui.files.delete.confirmManyDesc"),
      confirmText: t("ui.files.delete.confirmText"),
      cancelText: t("ui.files.delete.cancelText"),
      variant: "destructive",
    });
    if (!ok) return;
    try {
      const { taskId } = await batchDeleteMutation.mutateAsync({
        paths: selection.selectedPaths,
      });
      deleteRunner.start(taskId);
    } catch (error: any) {
      notify({
        title: error.message || t("notifications.error.batchDelete"),
        type: "error",
      });
    }
  }, [selectedServer, selection, batchDeleteMutation, deleteRunner, notify, t]);

  const handleOpenArchiveModal = useCallback(() => {
    if (!selectedServer || selection.count === 0) return;
    openModal(CREATE_ARCHIVE_MODAL_ID, {
      selectedPaths: selection.selectedPaths,
      defaultName: `archive-${new Date().toISOString().slice(0, 10)}`,
      onConfirm: async (archiveName: string) => {
        try {
          const { taskId } = await createArchiveMutation.mutateAsync({
            paths: selection.selectedPaths,
            archiveName,
            destPath: currentPath,
          });
          archiveRunner.start(taskId);
        } catch (error: any) {
          notify({
            title: error.message || t("notifications.error.archiveCreate"),
            type: "error",
          });
        }
      },
    });
  }, [
    selectedServer,
    selection,
    currentPath,
    createArchiveMutation,
    archiveRunner,
    openModal,
    notify,
    t,
  ]);

  return {
    isBatchBusy,
    activeRunner,
    handleBatchDelete,
    handleOpenArchiveModal,
    extractArchiveMutation,
    extractRunner,
  };
}
