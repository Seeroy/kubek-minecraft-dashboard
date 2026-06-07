"use client";

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
import { AlertTriangle } from "lucide-react";

interface SaveConfirmationModalProps extends ModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

function SaveConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
}: SaveConfirmationModalProps) {
  const { t } = useTranslation("modules.serverSettings.modal");

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    onCancel();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-500/10 p-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription className="pt-1">
                {t("description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{t("question")}</p>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="sm:flex-1"
          >
            {t("restartLater")}
          </Button>
          <Button onClick={handleConfirm} className="sm:flex-1">
            {t("restartNow")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Modal ID for server save confirmation
export const SAVE_CONFIRMATION_MODAL_ID = "server-settings/save-confirmation";

// Component for modal registration
export function SaveConfirmationModalRegistration() {
  useThisModal({
    id: SAVE_CONFIRMATION_MODAL_ID,
    component: SaveConfirmationModal,
    module: "server-settings",
  });

  return null;
}
