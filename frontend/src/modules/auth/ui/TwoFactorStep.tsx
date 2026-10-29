"use client";

import type { TwoFactorMethod, UserProfile } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { motion } from "framer-motion";
import { ArrowLeft, KeyRound, Loader2, Send, ShieldCheck } from "lucide-react";
import { useTwoFactorChallenge } from "../hooks/useTwoFactorChallenge";

interface Props {
  challengeId: string;
  primary: TwoFactorMethod;
  methods: TwoFactorMethod[];
  expiresAt: number;
  onSuccess: (token: string, user: UserProfile) => void;
  onCancel: () => void;
}

export function TwoFactorStep({ challengeId, primary, methods, expiresAt, onSuccess, onCancel }: Props) {
  const { t } = useTranslation("modules.auth.twoFactor");
  const {
    method,
    code,
    changeCode,
    submitTotp,
    switchMethod,
    submitting,
    locked,
    attemptsLeft,
    canSubmit,
    remainingSec,
    error: shownError,
  } = useTwoFactorChallenge({ challengeId, primary, expiresAt, onSuccess });
  const otherMethod = methods.find((m) => m !== method);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={t("back")}
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {method === "totp" ? (
            <ShieldCheck className="size-4 text-primary" />
          ) : (
            <Send className="size-4 text-primary" />
          )}
          {method === "totp" ? t("totpTitle") : t("telegramTitle")}
        </div>
      </div>

      {method === "totp" ? (
        <div className="space-y-2">
          <Label
            htmlFor="totp-code"
            className="text-xs font-medium text-muted-foreground"
          >
            {t("totpLabel")}
          </Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="totp-code"
              autoFocus
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              disabled={submitting || locked}
              value={code}
              onChange={(e) => changeCode(e.target.value)}
              className="h-11 pl-9 text-center font-mono tracking-[0.4em]"
            />
          </div>
          {attemptsLeft !== null && attemptsLeft > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("attemptsLeft", attemptsLeft)}
            </p>
          ) : null}
          <Button
            className="w-full"
            type="button"
            onClick={submitTotp}
            disabled={!canSubmit}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              t("confirm")
            )}
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
          <div className="mb-3 flex items-center gap-2">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span className="text-foreground">{t("telegramPrompt")}</span>
          </div>
          <p className="text-xs">
            {t(
              "telegramHint",
              `${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, "0")}`
            )}
          </p>
        </div>
      )}

      {otherMethod ? (
        <button
          type="button"
          onClick={() => switchMethod(otherMethod)}
          disabled={submitting}
          className="text-xs text-primary underline-offset-4 hover:underline disabled:opacity-50"
        >
          {otherMethod === "totp" ? t("useTotp") : t("useTelegram")}
        </button>
      ) : null}

      {shownError ? (
        <Alert variant="destructive">
          <AlertDescription>{shownError}</AlertDescription>
        </Alert>
      ) : null}
    </motion.div>
  );
}
