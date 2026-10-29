"use client";

import { api, type ChallengeStatusResponse, type TwoFactorMethod, type UserProfile } from "@/api";
import { useNow } from "@/shared/hooks/useNow";
import { formatWait, useRetryLock } from "@/shared/hooks/useRetryLock";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { ApiError } from "@/shared/lib/http";
import { qk } from "@/shared/queries/query-keys";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

const POLL_MS = 2000;
const CODE_LENGTH = 6;

const isTerminal = (status: ChallengeStatusResponse["status"] | undefined) =>
  status === "approved" || status === "denied" || status === "expired";

interface ChallengeOptions {
  challengeId: string;
  primary: TwoFactorMethod;
  expiresAt: number;
  onSuccess: (token: string, user: UserProfile) => void;
}

/** Login 2FA: TOTP input, Telegram polling and method switch */
export function useTwoFactorChallenge({
  challengeId: initialChallengeId,
  primary,
  expiresAt: initialExpiresAt,
  onSuccess,
}: ChallengeOptions) {
  const { t } = useTranslation("modules.auth.twoFactor");
  const retryLock = useRetryLock();
  const now = useNow();
  const [challengeId, setChallengeId] = useState(initialChallengeId);
  const [method, setMethod] = useState<TwoFactorMethod>(primary);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  // Blocks a double submit before isPending updates
  const submitRef = useRef(false);
  const approvedRef = useRef(false);

  // One request at a time, stops when approved, denied or expired
  const poll = useQuery({
    queryKey: qk.auth.challenge(challengeId),
    queryFn: () => api.auth.pollChallenge(challengeId),
    enabled: method === "telegram",
    refetchInterval: (query) => (isTerminal(query.state.data?.status) ? false : POLL_MS),
    retry: false,
    gcTime: 0,
    // Ignore errors, the next tick retries
    meta: { silent: true },
  });

  const status = method === "telegram" ? poll.data?.status : undefined;
  useEffect(() => {
    const result = poll.data;
    if (method !== "telegram" || approvedRef.current) return;
    if (result?.status === "approved" && result.token && result.user) {
      approvedRef.current = true;
      onSuccess(result.token, result.user);
    }
  }, [method, poll.data, onSuccess]);

  const pollError = status === "denied" ? t("errors.telegramDenied") : status === "expired" ? t("errors.expired") : "";

  const verify = useMutation({
    mutationFn: (value: string) => api.auth.verifyTotpChallenge(challengeId, value),
    meta: { silent: true },
  });
  const switchTo = useMutation({
    mutationFn: (target: TwoFactorMethod) => api.auth.switchChallenge(challengeId, target),
    meta: { silent: true },
  });
  const submitting = verify.isPending || switchTo.isPending;

  const submitTotp = async (value = code) => {
    if (submitRef.current || locked || retryLock.locked) return;
    submitRef.current = true;
    setError("");
    try {
      const res = await verify.mutateAsync(value);
      onSuccess(res.token, res.user);
    } catch (err: unknown) {
      if (retryLock.capture(err)) {
        setError("");
      } else if (err instanceof ApiError && err.code === "TOTP_LOCKED") {
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
      submitRef.current = false;
    }
  };

  // Submit on the sixth digit
  const changeCode = (raw: string) => {
    const next = raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(next);
    if (method === "totp" && next.length === CODE_LENGTH && !submitting) void submitTotp(next);
  };

  const switchMethod = async (target: TwoFactorMethod) => {
    if (target === method) return;
    setError("");
    setAttemptsLeft(null);
    setLocked(false);
    try {
      const res = await switchTo.mutateAsync(target);
      setChallengeId(res.challengeId);
      setMethod(res.method);
      setExpiresAt(res.expiresAt);
      setCode("");
    } catch (err) {
      if (!retryLock.capture(err)) setError(t("errors.switchFailed"));
    }
  };

  return {
    method,
    code,
    changeCode,
    submitTotp: () => void submitTotp(),
    switchMethod,
    submitting,
    locked,
    attemptsLeft,
    canSubmit: !submitting && !locked && code.length === CODE_LENGTH,
    remainingSec: Math.max(0, Math.floor((expiresAt - now) / 1000)),
    error: retryLock.locked ? t("errors.rateLimited", formatWait(retryLock.seconds)) : error || pollError,
  };
}
