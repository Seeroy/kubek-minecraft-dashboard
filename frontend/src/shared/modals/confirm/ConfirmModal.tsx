"use client";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { modalApi } from "@/shared/stores/modal-store";
import { ModalProps } from "@/shared/types/modal.types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { LucideIcon } from "lucide-react";

export interface ConfirmProps {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  icon?: LucideIcon;
}

export const CONFIRM_MODAL_ID = "shared/confirm";

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "shared/confirm": { props: ConfirmProps; result: boolean };
  }
}

function ConfirmModalComponent({
  isOpen,
  onClose,
  title,
  description,
  confirmText,
  cancelText,
  variant = "default",
  icon: Icon,
}: ModalProps<boolean> & ConfirmProps) {
  const { t } = useTranslation("modules.commonModals.confirm");

  const handleConfirm = () => onClose(true);
  const handleCancel = () => onClose(false);

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <AlertDialogContent>
        {Icon && (
          <AlertDialogMedia>
            <Icon />
          </AlertDialogMedia>
        )}
        <AlertDialogHeader>
          <AlertDialogTitle>{title || t("defaultTitle")}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {cancelText || t("cancelText")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            variant={variant === "destructive" ? "destructive" : "default"}
          >
            {confirmText || t("confirmText")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ConfirmModalRegistration() {
  useThisModal({
    id: CONFIRM_MODAL_ID,
    component: ConfirmModalComponent,
    module: "shared",
  });
  return null;
}

export async function confirmDialog(props: ConfirmProps): Promise<boolean> {
  const result = await modalApi.open(CONFIRM_MODAL_ID, props);
  return result === true;
}
