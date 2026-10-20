"use client";
import { api } from "@/api";
import type { Translator } from "@/locales/types";
import { useNotifications } from "@/modules/notifications";
import { useCallback, useRef, useState } from "react";

export interface ContentUpload {
  isDragOver: boolean;
  isUploading: boolean;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragEnter: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
}

interface ContentUploadOptions {
  serverId: string | undefined;
  // Server sub-directory to drop the jars into
  folder: "plugins" | "mods";
  // Dashboard translator (notifications.* keys)
  t: Translator;
  onComplete?: () => void;
}

// Drop or pick .jar files and upload them into the plugins/mods folder
export function useContentUpload({
  serverId,
  folder,
  t,
  onComplete,
}: ContentUploadOptions): ContentUpload {
  const { notify, update, close } = useNotifications();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // Counter avoids flicker from dragenter/dragleave on nested children
  const dragCounter = useRef(0);

  const uploadFiles = useCallback(
    async (incoming: File[]) => {
      if (!serverId) return;
      const jars = incoming.filter((f) =>
        f.name.toLowerCase().endsWith(".jar")
      );
      if (jars.length === 0) {
        if (incoming.length > 0) {
          notify({ type: "error", title: t("notifications.uploadNoJar") });
        }
        return;
      }

      setIsUploading(true);
      const toastId = notify({
        type: "progress",
        title: t("notifications.uploading"),
        progress: 0,
        duration: 0,
        message: `0 / ${jars.length}`,
      });

      let success = 0;
      const failures: string[] = [];
      for (let i = 0; i < jars.length; i++) {
        const file = jars[i];
        try {
          await api.files.uploadFile(serverId, folder, file);
          success++;
        } catch (err) {
          const reason = err instanceof Error ? err.message : "error";
          failures.push(`${file.name} (${reason})`);
        }
        const done = i + 1;
        update(toastId, {
          progress: Math.round((done / jars.length) * 100),
          message: `${done} / ${jars.length}: ${file.name}`,
        });
      }

      close(toastId);
      if (failures.length === 0) {
        notify({
          type: "success",
          title: t("notifications.uploadedMany", { count: success }),
        });
      } else {
        notify({
          type: "error",
          title: t("notifications.uploadSome", {
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
    [serverId, folder, t, notify, update, close, onComplete]
  );

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
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragOver(false);
      void uploadFiles(Array.from(e.dataTransfer.files));
    },
    [uploadFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      // Reset so picking the same file again re-fires change
      e.target.value = "";
      void uploadFiles(files);
    },
    [uploadFiles]
  );

  return {
    isDragOver,
    isUploading,
    handleInputChange,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  };
}
