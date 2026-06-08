import { api } from "@/api";
import { useNotificationsContext } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { filesAdapter } from "@/modules/files/api/files.adapter";
import type { IFile } from "@shared/types/file.types";
import { TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

interface UseBackupFileScanParams {
  isOpen: boolean;
  currentServerId?: string;
  backupType: "full" | "partial";
  selectionMode: "all" | "custom";
}

/**
 * Scans the server root directory for files, but only when the modal is open and
 * the user is configuring a partial backup with custom file selection
 */
export function useBackupFileScan({
  isOpen,
  currentServerId,
  backupType,
  selectionMode,
}: UseBackupFileScanParams) {
  const { t } = useTranslation("modules.backups");
  const { addNotification } = useNotificationsContext();

  const [files, setFiles] = useState<IFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  useEffect(() => {
    if (
      !isOpen ||
      !currentServerId ||
      selectionMode !== "custom" ||
      backupType !== "partial"
    ) {
      setFiles([]);
      return;
    }

    const loadFiles = async () => {
      setIsLoadingFiles(true);
      try {
        const scanned = await api.files.scanDirectory(currentServerId, "");
        setFiles(scanned.map(filesAdapter.toInternal));
      } catch (error) {
        addNotification({
          title: t("modals.createBackup.notifications.loadFilesFailed"),
          message: t(
            "modals.createBackup.notifications.loadFilesFailedMessage"
          ),
          type: "error",
          duration: 5000,
          icon: TriangleAlert,
        });
      } finally {
        setIsLoadingFiles(false);
      }
    };

    loadFiles();
  }, [isOpen, currentServerId, selectionMode, backupType, addNotification]);

  return { files, isLoadingFiles };
}
