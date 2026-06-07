"use client";
import { api } from "@/api";
import type { FilesTaskRunner } from "@/modules/files/hooks/useFilesTaskRunner";
import { FILE_EDITOR_MODAL_ID } from "@/modules/files/modals/EditorModal";
import { useNotifications } from "@/modules/notifications";
import type { Server } from "@/modules/server";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { canEditFile } from "@/shared/lib/fileTypes";
import { confirmDialog } from "@/shared/modals";
import { useExtractFilesArchiveMutation } from "@/modules/files/api/files.queries";
import { FileType, IFile } from "@shared/types/file.types";
import { useCallback, useState } from "react";

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
  const [isMutating, setIsMutating] = useState(false);

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

      setIsMutating(true);
      let initialContent: string | null = null;
      try {
        initialContent = await api.files.readFile(selectedServer.id, file.path);
      } catch (error: any) {
        notify({
          title: error.message || t("notifications.error.readFile"),
          type: "error",
        });
        return;
      } finally {
        setIsMutating(false);
      }

      const filename = file.path.split(/[\/\\]/).pop();
      const newValue = await openModal(FILE_EDITOR_MODAL_ID, {
        filename,
        initialValue: initialContent ?? "",
      });

      if (newValue == null) return; // cancelled

      setIsMutating(true);
      try {
        await api.files.writeFile(selectedServer.id, {
          path: file.path,
          data: newValue,
        });
        notify({
          title: t("notifications.success.fileSaved"),
          type: "success",
        });
        loadFiles();
      } catch (error: any) {
        notify({
          title: error.message || t("notifications.error.saveFile"),
          type: "error",
        });
      } finally {
        setIsMutating(false);
      }
    },
    [selectedServer, navigateToPath, notify, t, openModal, loadFiles]
  );

  const handleFileUpload = useCallback(() => {
    if (!selectedServer) return;

    const input = document.createElement("input");
    input.type = "file";
    input.multiple = false;

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsMutating(true);
      try {
        await api.files.uploadFile(selectedServer.id, currentPath, file);
        notify({
          title: t("notifications.success.fileUploaded"),
          type: "success",
        });
        loadFiles();
      } catch (error: any) {
        notify({
          title: error.message || t("notifications.error.uploadFile"),
          type: "error",
        });
      } finally {
        setIsMutating(false);
      }
    };

    input.click();
  }, [selectedServer, currentPath, loadFiles, notify, t]);

  const handleDeleteFile = useCallback(
    async (file: IFile) => {
      if (!selectedServer) return;

      const ok = await confirmDialog({
        title: `Delete ${file.type === FileType.DIRECTORY ? "Directory" : "File"}?`,
        description: `Are you sure you want to delete "${file.name}"? This action cannot be undone.`,
        confirmText: t("ui.files.delete.confirmText"),
        cancelText: t("ui.files.delete.cancelText"),
        variant: "destructive",
      });
      if (!ok) return;

      setIsMutating(true);
      try {
        if (file.type === FileType.DIRECTORY) {
          await api.files.deleteDirectory(selectedServer.id, {
            path: file.path,
          });
        } else {
          await api.files.deleteFile(selectedServer.id, { path: file.path });
        }
        notify({ title: t("notifications.success.deleted"), type: "success" });
        loadFiles();
      } catch (error: any) {
        notify({
          title: error.message || t("notifications.error.delete"),
          type: "error",
        });
      } finally {
        setIsMutating(false);
      }
    },
    [selectedServer, loadFiles, notify, t]
  );

  const handleDownloadFile = useCallback(
    async (file: IFile) => {
      if (!selectedServer || file.type !== FileType.FILE) return;

      setIsMutating(true);
      let url: string | undefined;
      let anchor: HTMLAnchorElement | undefined;
      try {
        const blob = await api.files.downloadFile(selectedServer.id, file.path);
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
      } catch (error: any) {
        notify({
          title: error.message || t("notifications.error.downloadFile"),
          type: "error",
        });
      } finally {
        // Always release the blob URL and DOM node, even if click/append threw
        if (anchor?.parentNode) document.body.removeChild(anchor);
        if (url) window.URL.revokeObjectURL(url);
        setIsMutating(false);
      }
    },
    [selectedServer, notify, t]
  );

  const handleExtractFile = useCallback(
    async (file: IFile) => {
      if (!selectedServer) return;
      try {
        const { taskId } = await extractArchiveMutation.mutateAsync({
          path: file.path,
        });
        extractRunner.start(taskId);
      } catch (error: any) {
        notify({
          title: error.message || t("notifications.error.archiveExtract"),
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
