"use client";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useFilesList, useInvalidateFiles } from "@/modules/files/api/files.queries";
import { IFile } from "@shared/types/file.types";
import { useCallback, useEffect } from "react";

export interface FilesData {
  files: IFile[];
  isInitialLoading: boolean;
  loadFiles: () => void;
}

interface FilesDataOptions {
  serverId: string | undefined;
  currentPath: string;
}

export function useFilesData({
  serverId,
  currentPath,
}: FilesDataOptions): FilesData {
  const { t } = useTranslation("modules.files");
  const { notify } = useNotifications();

  const filesQuery = useFilesList(serverId, currentPath);
  const invalidateFiles = useInvalidateFiles();

  const files: IFile[] = filesQuery.data ?? [];
  const isInitialLoading = filesQuery.isLoading && !filesQuery.data;

  useEffect(() => {
    if (filesQuery.isError) {
      const err = filesQuery.error as Error | undefined;
      notify({
        title: err?.message || t("notifications.error.loadFiles"),
        type: "error",
      });
    }
  }, [filesQuery.isError, filesQuery.error, notify, t]);

  const loadFiles = useCallback(() => {
    invalidateFiles(serverId);
  }, [invalidateFiles, serverId]);

  return { files, isInitialLoading, loadFiles };
}
