"use client";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { modalApi } from "@/shared/stores/modal-store";
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
import { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

export interface ConfirmWithPasswordProps {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  icon?: LucideIcon;
  requirePassword?: boolean;
  requireNameConfirm?: { expected: string; label?: string };
}

export interface ConfirmWithPasswordResult {
  password?: string;
}

export const CONFIRM_WITH_PASSWORD_MODAL_ID = "shared/confirm-with-password";

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "shared/confirm-with-password": {
      props: ConfirmWithPasswordProps;
      result: ConfirmWithPasswordResult | null;
    };
  }
}

function ConfirmWithPasswordModalComponent({
  isOpen,
  onClose,
  title,
  description,
  confirmText,
  cancelText,
  variant = "destructive",
  requirePassword = true,
  requireNameConfirm,
}: ModalProps<ConfirmWithPasswordResult | null> & ConfirmWithPasswordProps) {
  const { t } = useTranslation("modules.commonModals.confirmWithPassword");
  const [password, setPassword] = useState("");
  const [nameConfirm, setNameConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setNameConfirm("");
      setPasswordError(null);
      setNameError(null);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    let valid = true;
    if (requirePassword && !password) {
      setPasswordError(t("passwordRequired"));
      valid = false;
    }
    if (requireNameConfirm && nameConfirm !== requireNameConfirm.expected) {
      setNameError(t("nameMismatch"));
      valid = false;
    }
    if (!valid) return;
    onClose({ password: requirePassword ? password : undefined });
  };

  const handleCancel = () => onClose(null);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title || t("defaultTitle")}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          {requireNameConfirm && (
            <div className="space-y-2">
              <Label htmlFor="cwp-name">
                {requireNameConfirm.label || t("nameLabel")}
              </Label>
              <Input
                id="cwp-name"
                value={nameConfirm}
                onChange={(e) => {
                  setNameConfirm(e.target.value);
                  if (nameError) setNameError(null);
                }}
                placeholder={requireNameConfirm.expected}
                aria-invalid={!!nameError}
              />
              {nameError && (
                <p className="text-xs text-destructive">{nameError}</p>
              )}
            </div>
          )}

          {requirePassword && (
            <div className="space-y-2">
              <Label htmlFor="cwp-password">{t("passwordLabel")}</Label>
              <Input
                id="cwp-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                placeholder={t("passwordPlaceholder")}
                autoFocus
                aria-invalid={!!passwordError}
              />
              {passwordError && (
                <p className="text-xs text-destructive">{passwordError}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {cancelText || t("cancelText")}
          </Button>
          <Button
            onClick={handleConfirm}
            variant={variant === "destructive" ? "destructive" : "default"}
          >
            {confirmText || t("confirmText")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmWithPasswordModalRegistration() {
  useThisModal({
    id: CONFIRM_WITH_PASSWORD_MODAL_ID,
    component: ConfirmWithPasswordModalComponent,
    module: "shared",
  });
  return null;
}

export async function confirmWithPasswordDialog(
  props: ConfirmWithPasswordProps
): Promise<ConfirmWithPasswordResult | null> {
  const result = await modalApi.open(CONFIRM_WITH_PASSWORD_MODAL_ID, props);
  return result ?? null;
}
