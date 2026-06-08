"use client";
import { api } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useServerStore } from "@/modules/server";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { ModalProps } from "@/shared/types/modal.types";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Folder } from "lucide-react";
import { useEffect, useState } from "react";

interface NewDirectoryModalProps extends ModalProps {
  currentPath?: string;
  onCreated?: (directoryName: string) => void;
  initialName?: string;
}

function NewDirectoryModalComponent({
  isOpen,
  onClose,
  currentPath = "/",
  onCreated,
  initialName = "",
}: NewDirectoryModalProps) {
  const { t } = useTranslation("modules.files");
  const [directoryName, setDirectoryName] = useState(initialName);
  const [isLoading, setIsLoading] = useState(false);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setDirectoryName(initialName);
      setIsLoading(false);
    }
  }, [isOpen, initialName]);

  const { selectedServer } = useServerStore();
  const { notify } = useNotifications();

  const handleNewDirectory = async () => {
    if (!directoryName.trim() || !selectedServer) return;

    setIsLoading(true);
    try {
      await api.files.createDirectory(selectedServer.id, {
        path: currentPath,
        name: directoryName.trim(),
      });

      notify({
        title: t("notifications.success.directoryCreated"),
        type: "success",
      });
      onCreated?.(directoryName.trim());
      onClose();
    } catch (error: any) {
      notify({
        title: error.message || t("notifications.error.createDirectory"),
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && directoryName.trim()) {
      handleNewDirectory();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Folder className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{t("modals.newDirectory.title")}</DialogTitle>
              <DialogDescription>
                {t("modals.newDirectory.description")} {currentPath}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="directoryname">
              {t("modals.newDirectory.form.directoryName.label")}
            </Label>
            <Input
              id="directoryname"
              value={directoryName}
              onChange={(e) => setDirectoryName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t(
                "modals.newDirectory.form.directoryName.placeholder"
              )}
              autoFocus
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter className="flex space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t("modals.newDirectory.cancel")}
          </Button>
          <Button
            onClick={handleNewDirectory}
            disabled={!directoryName.trim() || isLoading}
          >
            {isLoading
              ? t("modals.newDirectory.form.submit.loading")
              : t("modals.newDirectory.form.submit.default")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const CREATE_DIRECTORY_MODAL_ID = "files/new-directory";

export function NewDirectoryModalRegistration() {
  useThisModal({
    id: CREATE_DIRECTORY_MODAL_ID,
    component: NewDirectoryModalComponent,
    module: "file-manager",
  });

  return null;
}
