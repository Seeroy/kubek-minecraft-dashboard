"use client";
import type { FilesTaskRunner } from "@/modules/files/hooks/useFilesTaskRunner";
import { FILE_EDITOR_MODAL_ID } from "@/modules/files/modals";
import { useNotifications } from "@/modules/notifications";
import type { Server } from "@/modules/server";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { canEditFile } from "@/shared/lib/fileTypes";
import { confirmDialog } from "@/shared/modals";
import { Trash2 } from "lucide-react";
import {
  useDeleteEntryMutation,
  useDownloadFileMutation,
  useExtractFilesArchiveMutation,
  useReadFileMutation,
  useUploadFileMutation,
  useWriteFileMutation,
} from "@/modules/files/api/files.queries";
import { FileType, IFile } from "@shared/types/file.types";
import { useCallback } from "react";

interface FileOperationsOptions {
  selectedServer: Server | null;
  currentPath: string;
  loadFiles: () => void;
  navigateToPath: (path: string) => void;
  extractArchiveMutation: ReturnType<typeof useExtractFilesArchiveMutation>;
  extractRunner: FilesTaskRunner;
}

export interface FileOperations {
  isMutating: boolean;
  handleEditFile: (file: IFile) => Promise<void>;
  handleFileUpload: () => void;
  handleDeleteFile: (file: IFile) => Promise<void>;
  handleDownloadFile: (file: IFile) => Promise<void>;
  handleExtractFile: (file: IFile) => Promise<void>;
}

export function useFileOperations({
  selectedServer,
  currentPath,
  loadFiles,
  navigateToPath,
  extractArchiveMutation,
  extractRunner,
}: FileOperationsOptions): FileOperations {
  const { t } = useTranslation("modules.files");
  const { notify } = useNotifications();
  const { open: openModal } = useModal();
  const serverId = selectedServer?.id;
  const { mutateAsync: readFile, isPending: reading } = useReadFileMutation(serverId);
  const { mutateAsync: writeFile, isPending: writing } = useWriteFileMutation(serverId);
  const { mutateAsync: uploadFile, isPending: uploading } = useUploadFileMutation(serverId);
  const { mutateAsync: deleteEntry, isPending: deleting } = useDeleteEntryMutation(serverId);
  const { mutateAsync: downloadFile, isPending: downloading } = useDownloadFileMutation(serverId);
  const isMutating = reading || writing || uploading || deleting || downloading;

  // Opens the editor with the file's current content, then writes back on resolve
  const handleEditFile = useCallback(
    async (file: IFile) => {
      if (!selectedServer) return;

      if (file.type !== FileType.FILE) {
        navigateToPath(file.path);
        return;
      }

      if (!canEditFile(file.name)) {
        notify({
          title: t("notifications.error.cannotEditFile"),
          type: "error",
        });
        return;
      }

      let initialContent: string | null = null;
      try {
        initialContent = await readFile(file.path);
      } catch (error: unknown) {
        notify({
          title: (error instanceof Error && error.message) || t("notifications.error.readFile"),
          type: "error",
        });
        return;
      }

      const filename = file.path.split(/[\/\\]/).pop();
      const newValue = await openModal(FILE_EDITOR_MODAL_ID, {
        filename,
        initialValue: initialContent ?? "",
      });

      if (newValue == null) return; // cancelled

      try {
        await writeFile({ path: file.path, data: newValue });
        notify({
          title: t("notifications.success.fileSaved"),
          type: "success",
        });
        loadFiles();
      } catch (error: unknown) {
        notify({
          title: (error instanceof Error && error.message) || t("notifications.error.saveFile"),
          type: "error",
        });
      }
    },
    [selectedServer, navigateToPath, notify, t, openModal, loadFiles, readFile, writeFile]
  );

  const handleFileUpload = useCallback(() => {
    if (!selectedServer) return;

    const input = document.createElement("input");
    input.type = "file";
    input.multiple = false;

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        await uploadFile({ path: currentPath, file });
        notify({
          title: t("notifications.success.fileUploaded"),
          type: "success",
        });
        loadFiles();
      } catch (error: unknown) {
        notify({
          title: (error instanceof Error && error.message) || t("notifications.error.uploadFile"),
          type: "error",
        });
      }
    };

    input.click();
  }, [selectedServer, currentPath, loadFiles, notify, t, uploadFile]);

  const handleDeleteFile = useCallback(
    async (file: IFile) => {
      if (!selectedServer) return;

      const ok = await confirmDialog({
        title: t(file.type === FileType.DIRECTORY ? "ui.files.delete.directoryTitle" : "ui.files.delete.fileTitle"),
        description: t("ui.files.delete.confirmDesc", file.name),
        confirmText: t("ui.files.delete.confirmText"),
        cancelText: t("ui.files.delete.cancelText"),
        variant: "destructive",
        icon: Trash2,
      });
      if (!ok) return;

      try {
        await deleteEntry(file);
        notify({ title: t("notifications.success.deleted"), type: "success" });
        loadFiles();
      } catch (error: unknown) {
        notify({
          title: (error instanceof Error && error.message) || t("notifications.error.delete"),
          type: "error",
        });
      }
    },
    [selectedServer, loadFiles, notify, t, deleteEntry]
  );

  const handleDownloadFile = useCallback(
    async (file: IFile) => {
      if (!selectedServer || file.type !== FileType.FILE) return;

      let url: string | undefined;
      let anchor: HTMLAnchorElement | undefined;
      try {
        const blob = await downloadFile(file.path);
        url = window.URL.createObjectURL(blob);
        anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = file.name;
        document.body.appendChild(anchor);
        anchor.click();
        notify({
          title: t("notifications.success.fileDownloaded"),
          type: "success",
        });
      } catch (error: unknown) {
        notify({
          title: (error instanceof Error && error.message) || t("notifications.error.downloadFile"),
          type: "error",
        });
      } finally {
        // Always release the blob URL and DOM node, even if click/append threw
        if (anchor?.parentNode) document.body.removeChild(anchor);
        if (url) window.URL.revokeObjectURL(url);
      }
    },
    [selectedServer, notify, t, downloadFile]
  );

  const handleExtractFile = useCallback(
    async (file: IFile) => {
      if (!selectedServer) return;
      try {
        const { taskId } = await extractArchiveMutation.mutateAsync({
          path: file.path,
        });
        extractRunner.start(taskId);
      } catch (error: unknown) {
        notify({
          title: (error instanceof Error && error.message) || t("notifications.error.archiveExtract"),
          type: "error",
        });
      }
    },
    [selectedServer, extractArchiveMutation, extractRunner, notify, t]
  );

  return {
    isMutating,
    handleEditFile,
    handleFileUpload,
    handleDeleteFile,
    handleDownloadFile,
    handleExtractFile,
  };
}
