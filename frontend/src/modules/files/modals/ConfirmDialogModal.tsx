"use client";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { ModalProps } from "@/shared/types/modal.types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";

interface ConfirmDialogModalProps extends ModalProps {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  variant?: "default" | "destructive";
}

function ConfirmDialogModalComponent({
  isOpen,
  onClose,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  variant = "default",
}: ConfirmDialogModalProps) {
  const { t } = useTranslation("modules.files");

  const defaultTitle = t("modals.confirmDialog.defaultTitle");
  const defaultConfirmText = t("modals.confirmDialog.confirmText");
  const defaultCancelText = t("modals.confirmDialog.cancelText");
  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title || defaultTitle}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>
            {cancelText || defaultCancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={
              variant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {confirmText || defaultConfirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const CONFIRM_DIALOG_MODAL_ID = "files/confirm-dialog";

export function ConfirmDialogModalRegistration() {
  useThisModal({
    id: CONFIRM_DIALOG_MODAL_ID,
    component: ConfirmDialogModalComponent,
    module: "file-manager",
  });

  return null;
}
