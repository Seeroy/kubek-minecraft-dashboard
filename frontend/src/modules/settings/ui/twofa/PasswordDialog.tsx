"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Plate } from "@/shared/ui/plate";
import { Spinner } from "@/shared/ui/spinner";
import { KeyRound } from "lucide-react";
import { useState } from "react";

interface PasswordDialogProps {
  title: string;
  /** Resolves when the action went through, the dialog closes then */
  onConfirm: (password: string) => Promise<unknown>;
  onClose: () => void;
}

/** Asks for the account password before a security change */
export function PasswordDialog({ title, onConfirm, onClose }: PasswordDialogProps) {
  const { t } = useTranslation("modules.settings.twofa");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    try {
      await onConfirm(password);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err) || t("toasts.invalidPassword"));
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit} className="contents">
          <DialogHeader className="flex-row items-center gap-3">
            <Plate tone="purple">
              <KeyRound />
            </Plate>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{t("passwordDialog.description")}</DialogDescription>
            </div>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="confirm-password">{t("passwordDialog.password")}</FieldLabel>
            <Input
              id="confirm-password"
              type="password"
              autoFocus
              autoComplete="current-password"
              aria-invalid={!!error}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
            />
            {error && <FieldError>{error}</FieldError>}
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              {t("passwordDialog.cancel")}
            </Button>
            <Button type="submit" disabled={pending || !password}>
              {pending && <Spinner />}
              {t("passwordDialog.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
