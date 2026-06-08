"use client";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { modalApi } from "@/shared/stores/modal-store";
import { ModalProps } from "@/shared/types/modal.types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  LucideIcon,
} from "lucide-react";

export type AlertVariant = "info" | "warning" | "error" | "success";

export interface AlertProps {
  title?: string;
  description?: string;
  variant?: AlertVariant;
  confirmText?: string;
  icon?: LucideIcon;
}

export const ALERT_MODAL_ID = "shared/alert";

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "shared/alert": { props: AlertProps; result: void };
  }
}

const ICON_BY_VARIANT: Record<AlertVariant, LucideIcon> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle2,
};

const MEDIA_CLASS_BY_VARIANT: Record<AlertVariant, string> = {
  info: "bg-primary/10 text-primary",
  warning: "bg-amber-500/10 text-amber-500",
  error: "bg-destructive/10 text-destructive",
  success: "bg-emerald-500/10 text-emerald-500",
};

function AlertModalComponent({
  isOpen,
  onClose,
  title,
  description,
  variant = "info",
  confirmText,
  icon,
}: ModalProps<void> & AlertProps) {
  const { t } = useTranslation("modules.commonModals.alert");
  const Icon = icon || ICON_BY_VARIANT[variant];

  const handleClose = () => onClose();

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent>
        <AlertDialogMedia className={MEDIA_CLASS_BY_VARIANT[variant]}>
          <Icon />
        </AlertDialogMedia>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {title || t(`variants.${variant}`)}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={handleClose}
            variant={variant === "error" ? "destructive" : "default"}
          >
            {confirmText || t("confirmText")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AlertModalRegistration() {
  useThisModal({
    id: ALERT_MODAL_ID,
    component: AlertModalComponent,
    module: "shared",
  });
  return null;
}

export async function alertDialog(props: AlertProps): Promise<void> {
  await modalApi.open(ALERT_MODAL_ID, props);
}
