import { asyncTimeout } from "@/core/utils/asyncTimeout";

/** Re-run the check until it passes or the time is up, true when it passed */
export async function pollUntil(
  check: () => Promise<boolean>,
  { timeoutMs, intervalMs }: { timeoutMs: number; intervalMs: number },
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await check()) return true;
    if (Date.now() + intervalMs > deadline) return false;
    await asyncTimeout(intervalMs);
  }
}
