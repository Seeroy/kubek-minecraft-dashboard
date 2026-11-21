/** How long a server gets to stop before it's killed */
export const DEFAULT_STOP_TIMEOUT_SEC = 60;

const MAX_STOP_TIMEOUT_SEC = 3600;

/** Seconds before SIGKILL, KUBEK_STOP_TIMEOUT overrides it */
export function stopTimeoutSec(
  raw: string | undefined = process.env.KUBEK_STOP_TIMEOUT,
): number {
  const value = Number(raw);
  if (!raw?.trim() || !Number.isFinite(value) || value < 1) {
    return DEFAULT_STOP_TIMEOUT_SEC;
  }
  // Capped at an hour in case of a typo
  return Math.min(Math.round(value), MAX_STOP_TIMEOUT_SEC);
}

/** Blueprint stop.timeoutSec, undefined means the panel default */
export function blueprintStopTimeoutSec(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) {
    return undefined;
  }
  return Math.min(Math.round(value), MAX_STOP_TIMEOUT_SEC);
}
