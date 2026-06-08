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
import { useEffect, useState } from "react";

export interface PromptProps {
  title?: string;
  description?: string;
  label?: string;
  initialValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  validate?: (value: string) => string | null;
  required?: boolean;
}

export const PROMPT_MODAL_ID = "shared/prompt";

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "shared/prompt": { props: PromptProps; result: string | null };
  }
}

function PromptModalComponent({
  isOpen,
  onClose,
  title,
  description,
  label,
  initialValue = "",
  placeholder,
  confirmText,
  cancelText,
  validate,
  required = true,
}: ModalProps<string | null> & PromptProps) {
  const { t } = useTranslation("modules.commonModals.prompt");
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setError(null);
    }
  }, [isOpen, initialValue]);

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (required && !trimmed) {
      setError(t("validationRequired"));
      return;
    }
    if (validate) {
      const err = validate(value);
      if (err) {
        setError(err);
        return;
      }
    }
    onClose(value);
  };

  const handleCancel = () => onClose(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title || t("defaultTitle")}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-2">
          {label && <Label htmlFor="prompt-input">{label}</Label>}
          <Input
            id="prompt-input"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus
            aria-invalid={!!error}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {cancelText || t("cancelText")}
          </Button>
          <Button onClick={handleConfirm}>
            {confirmText || t("confirmText")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PromptModalRegistration() {
  useThisModal({
    id: PROMPT_MODAL_ID,
    component: PromptModalComponent,
    module: "shared",
  });
  return null;
}

export async function promptDialog(props: PromptProps): Promise<string | null> {
  const result = await modalApi.open(PROMPT_MODAL_ID, props);
  return result ?? null;
}
