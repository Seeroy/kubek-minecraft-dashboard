import type { RetentionLimits } from "@shared/types/backup.types";

const DAY = 24 * 60 * 60 * 1000;

export interface RetentionCandidate {
  id: string;
  createdAt: number;
  pinned: boolean;
}

/**
 * Copies of one location that fall outside its limits. The newest copy always
 * stays, so a broken schedule never wipes the last good backup
 */
export function planRetention<T extends RetentionCandidate>(
  copies: T[],
  limits: RetentionLimits,
  now: number,
): T[] {
  if (limits.keepCount === null && limits.keepDays === null) return [];
  const newestFirst = [...copies].sort((a, b) => b.createdAt - a.createdAt);
  const cutoff = limits.keepDays === null ? null : now - limits.keepDays * DAY;

  let kept = 0;
  return newestFirst.filter((copy, index) => {
    if (copy.pinned) return false;
    if (index === 0) {
      kept++;
      return false;
    }
    const overCount = limits.keepCount !== null && kept >= limits.keepCount;
    const tooOld = cutoff !== null && copy.createdAt < cutoff;
    if (overCount || tooOld) return true;
    kept++;
    return false;
  });
}
