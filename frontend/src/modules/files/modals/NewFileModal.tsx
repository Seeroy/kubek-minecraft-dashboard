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
import { FileText } from "lucide-react";
import { useEffect, useState } from "react";

interface NewFileModalProps extends ModalProps {
  currentPath?: string;
  onCreated?: (fileName: string) => void;
  initialName?: string;
}

function NewFileModalComponent({
  isOpen,
  onClose,
  currentPath = "/",
  onCreated,
  initialName = "",
}: NewFileModalProps) {
  const { t } = useTranslation("modules.files");
  const [fileName, setFileName] = useState(initialName);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFileName(initialName);
      setIsLoading(false);
    }
  }, [isOpen, initialName]);

  const { selectedServer } = useServerStore();
  const { notify } = useNotifications();

  const handleNewFile = async () => {
    if (!fileName.trim() || !selectedServer) return;

    setIsLoading(true);
    try {
      const filePath =
        currentPath === "/" || currentPath === ""
          ? fileName.trim()
          : `${currentPath}/${fileName.trim()}`;

      await api.files.writeFile(selectedServer.id, {
        path: filePath,
        data: " ",
      });

      notify({
        title: t("notifications.success.fileCreated"),
        type: "success",
      });
      onCreated?.(fileName.trim());
      onClose();
    } catch (error: any) {
      notify({
        title: error.message || t("notifications.error.createFile"),
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && fileName.trim()) {
      handleNewFile();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{t("modals.newFile.title")}</DialogTitle>
              <DialogDescription>
                {t("modals.newFile.description")} {currentPath}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="filename">
              {t("modals.newFile.form.fileName.label")}
            </Label>
            <Input
              id="filename"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t("modals.newFile.form.fileName.placeholder")}
              autoFocus
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter className="flex space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t("modals.newFile.cancel")}
          </Button>
          <Button
            onClick={handleNewFile}
            disabled={!fileName.trim() || isLoading}
          >
            {isLoading
              ? t("modals.newFile.form.submit.loading")
              : t("modals.newFile.form.submit.default")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const CREATE_FILE_MODAL_ID = "files/new-file";

export function NewFileModalRegistration() {
  useThisModal({
    id: CREATE_FILE_MODAL_ID,
    component: NewFileModalComponent,
    module: "file-manager",
  });

  return null;
}
