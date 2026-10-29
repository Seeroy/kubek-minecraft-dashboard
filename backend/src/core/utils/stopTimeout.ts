/** How long a server gets to stop before it's killed */
export const DEFAULT_STOP_TIMEOUT_SEC = 60;

/** Seconds before SIGKILL, KUBEK_STOP_TIMEOUT overrides it */
export function stopTimeoutSec(
  raw: string | undefined = process.env.KUBEK_STOP_TIMEOUT,
): number {
  const value = Number(raw);
  if (!raw?.trim() || !Number.isFinite(value) || value < 1) {
    return DEFAULT_STOP_TIMEOUT_SEC;
  }
  // Capped at an hour in case of a typo
  return Math.min(Math.round(value), 3600);
}
