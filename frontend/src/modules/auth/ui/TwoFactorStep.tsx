"use client";

import { api, type TwoFactorMethod, type UserProfile } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { ApiError } from "@/shared/lib/http";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { motion } from "framer-motion";
import { ArrowLeft, KeyRound, Loader2, Send, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  challengeId: string;
  primary: TwoFactorMethod;
  methods: TwoFactorMethod[];
  expiresAt: number;
  onSuccess: (token: string, user: UserProfile) => void;
  onCancel: () => void;
}

export function TwoFactorStep({
  challengeId: initialChallengeId,
  primary,
  methods,
  expiresAt: initialExpiresAt,
  onSuccess,
  onCancel,
}: Props) {
  const { t } = useTranslation("modules.auth.twoFactor");
  const [challengeId, setChallengeId] = useState(initialChallengeId);
  const [method, setMethod] = useState<TwoFactorMethod>(primary);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [now, setNow] = useState(Date.now());
  const submitRef = useRef(false);

  // Tick for countdown
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Polling for telegram approval
  useEffect(() => {
    if (method !== "telegram") return;
    let cancelled = false;
    const poll = async () => {
      try {
        const result = await api.auth.pollChallenge(challengeId);
        if (cancelled) return;
        if (result.status === "approved" && result.token && result.user) {
          onSuccess(result.token, result.user);
          return;
        }
        if (result.status === "denied") {
          setError(t("errors.telegramDenied"));
          return;
        }
        if (result.status === "expired") {
          setError(t("errors.expired"));
          return;
        }
      } catch {
        // ignore transient errors
      }
    };
    const id = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [method, challengeId, onSuccess]);

  const submitTotp = async () => {
    if (submitRef.current || locked) return;
    submitRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      const res = await api.auth.verifyTotpChallenge(challengeId, code);
      onSuccess(res.token, res.user);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === "TOTP_LOCKED") {
        setLocked(true);
        setAttemptsLeft(0);
        setError(t("errors.locked"));
      } else if (err instanceof ApiError && err.code === "TOTP_INVALID") {
        setAttemptsLeft(err.attemptsLeft ?? null);
        setError(t("errors.invalidCode"));
      } else {
        setError(t("errors.invalidCode"));
      }
      setCode("");
    } finally {
      setSubmitting(false);
      submitRef.current = false;
    }
  };

  // Auto-submit on 6 digits
  useEffect(() => {
    if (method === "totp" && code.length === 6 && !submitting) {
      void submitTotp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const switchMethod = async (target: TwoFactorMethod) => {
    if (target === method) return;
    setError("");
    setAttemptsLeft(null);
    setLocked(false);
    setSubmitting(true);
    try {
      const res = await api.auth.switchChallenge(challengeId, target);
      setChallengeId(res.challengeId);
      setMethod(res.method);
      setExpiresAt(res.expiresAt);
      setCode("");
    } catch {
      setError(t("errors.switchFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const remainingSec = Math.max(0, Math.floor((expiresAt - now) / 1000));
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
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
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
            disabled={submitting || locked || code.length !== 6}
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

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </motion.div>
  );
}
