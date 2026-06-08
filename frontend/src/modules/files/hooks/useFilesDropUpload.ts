"use client";
import { api } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useCallback, useRef, useState } from "react";

export interface FilesDropUpload {
  isDragOver: boolean;
  isUploading: boolean;
  handleDragEnter: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
}

interface FilesDropUploadOptions {
  serverId: string | undefined;
  currentPath: string;
  onComplete?: () => void;
}

export function useFilesDropUpload({
  serverId,
  currentPath,
  onComplete,
}: FilesDropUploadOptions): FilesDropUpload {
  const { notify, update, close } = useNotifications();
  const { t } = useTranslation("modules.files");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // Browsers fire dragenter/dragleave for nested children. A counter avoids flicker
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.stopPropagation();
    // Required for drop to fire
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragOver(false);

      if (!serverId) return;
      // Folder drops would require DataTransferItem.webkitGetAsEntry traversal - out of scope
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      setIsUploading(true);
      const toastId = notify({
        type: "progress",
        title: t("notifications.progress.uploading"),
        progress: 0,
        duration: 0,
        message: `0 / ${files.length}`,
      });

      let success = 0;
      const failures: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          await api.files.uploadFile(serverId, currentPath, file);
          success++;
        } catch (err: any) {
          failures.push(`${file.name} (${err.message || "error"})`);
        }
        const done = i + 1;
        const progress = Math.round((done / files.length) * 100);
        update(toastId, {
          progress,
          message: `${done} / ${files.length}: ${file.name}`,
        });
      }

      close(toastId);
      if (failures.length === 0) {
        notify({
          type: "success",
          title: t("notifications.success.uploadedMany", { count: success }),
        });
      } else {
        notify({
          type: "error",
          title: t("notifications.error.uploadSome", {
            ok: success,
            fail: failures.length,
          }),
          message:
            failures.slice(0, 3).join(", ") + (failures.length > 3 ? "…" : ""),
        });
      }

      setIsUploading(false);
      onComplete?.();
    },
    [serverId, currentPath, notify, update, close, t, onComplete]
  );

  return {
    isDragOver,
    isUploading,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  };
}
