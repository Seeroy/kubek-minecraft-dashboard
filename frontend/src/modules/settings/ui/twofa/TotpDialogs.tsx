"use client";

import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { Button } from "@/shared/ui/button";
import { CopyButton } from "@/shared/ui/CopyButton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Plate } from "@/shared/ui/plate";
import { Spinner } from "@/shared/ui/spinner";
import { Shield, ShieldOff } from "lucide-react";
import { useState } from "react";
import { useConfirmTotpMutation, useDisableTotpMutation } from "../../api/twofa.queries";

export interface TotpSetup {
  setupToken: string;
  secret: string;
  qrDataUrl: string;
}

// Groups of four are easier to retype by hand
const spaced = (secret: string) => secret.replace(/(.{4})(?=.)/g, "$1 ");

export function TotpSetupDialog({ setup, onClose }: { setup: TotpSetup; onClose: () => void }) {
  const { t } = useTranslation("modules.settings.twofa");
  const { notify } = useNotifications();
  const confirm = useConfirmTotpMutation();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    confirm.mutate(
      { setupToken: setup.setupToken, code },
      {
        onSuccess: () => {
          notify({ type: "success", title: t("toasts.totpEnabled") });
          onClose();
        },
        onError: (err) => {
          setError(getApiErrorMessage(err) || t("toasts.invalidCode"));
          setCode("");
        },
      }
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !confirm.isPending && onClose()}>
      <DialogContent className="sm:max-w-[620px]">
        <form onSubmit={submit} className="contents">
          <DialogHeader className="flex-row items-center gap-3">
            <Plate tone="purple">
              <Shield />
            </Plate>
            <div>
              <DialogTitle>{t("setup.title")}</DialogTitle>
              <DialogDescription>{t("setup.description")}</DialogDescription>
            </div>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-5">
            {/* QR comes inline as a data URL, nothing to optimise */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qrDataUrl} alt="" className="size-[168px] shrink-0 rounded-[10px] bg-white p-2.5" />
            <div className="grid min-w-56 flex-1 gap-3">
              <p className="text-[12.5px] text-muted-foreground">{t("setup.manual")}</p>
              <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-subtle py-1.5 pr-1.5 pl-3 font-mono text-[12.5px]">
                <span className="flex-1 break-all">{spaced(setup.secret)}</span>
                <CopyButton value={setup.secret} title={t("setup.copy")} />
              </div>
              <Field>
                <FieldLabel htmlFor="totp-code">{t("setup.code")}</FieldLabel>
                <Input
                  id="totp-code"
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  className="h-11 text-center font-mono text-xl font-semibold tracking-[0.4em]"
                  aria-invalid={!!error}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setError(null);
                  }}
                />
                {error && <FieldError>{error}</FieldError>}
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={confirm.isPending}>
              {t("setup.cancel")}
            </Button>
            <Button type="submit" disabled={confirm.isPending || code.length !== 6}>
              {confirm.isPending && <Spinner />}
              {t("setup.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DisableTotpDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("modules.settings.twofa");
  const { notify } = useNotifications();
  const disable = useDisableTotpMutation();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    disable.mutate(password, {
      onSuccess: () => {
        notify({ type: "success", title: t("toasts.totpDisabled") });
        onClose();
      },
      onError: (err) => setError(getApiErrorMessage(err) || t("toasts.invalidPassword")),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !disable.isPending && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit} className="contents">
          <DialogHeader className="flex-row items-center gap-3">
            <Plate tone="red">
              <ShieldOff />
            </Plate>
            <div>
              <DialogTitle>{t("disableDialog.title")}</DialogTitle>
              <DialogDescription>{t("disableDialog.description")}</DialogDescription>
            </div>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="totp-password">{t("disableDialog.password")}</FieldLabel>
            <Input
              id="totp-password"
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
            <Button type="button" variant="outline" onClick={onClose} disabled={disable.isPending}>
              {t("disableDialog.cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={disable.isPending || !password}>
              {disable.isPending && <Spinner />}
              {t("disableDialog.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
