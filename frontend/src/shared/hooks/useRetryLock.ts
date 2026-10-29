"use client";
import { ApiError } from "@/shared/lib/http/types";
import { useCallback, useState } from "react";
import { useNow } from "./useNow";

/** Tracks a server side rate limit lock, the countdown ticks once a second */
export function useRetryLock() {
  const [until, setUntil] = useState(0);
  const now = useNow();
  const seconds = Math.max(0, Math.ceil((until - now) / 1000));

  /** Starts the countdown when the error is a rate limit, returns whether it was */
  const capture = useCallback((err: unknown) => {
    if (!(err instanceof ApiError) || err.code !== "RATE_LIMITED") return false;
    setUntil(Date.now() + (err.retryAfter ?? 60) * 1000);
    return true;
  }, []);

  return { seconds, locked: seconds > 0, capture };
}

export const formatWait = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
