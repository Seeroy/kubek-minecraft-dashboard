type Translate = (key: string, ...args: unknown[]) => string;

/** Compact "2d 4h" / "3h 12m" / "8m", t must be scoped to modules.components */
export function formatDuration(seconds: number | null | undefined, t: Translate): string {
  if (!seconds || seconds <= 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return t("duration.days", d, h);
  if (h > 0) return t("duration.hours", h, m);
  return t("duration.minutes", m);
}

export const secondsSince = (iso: string | undefined) => {
  const start = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(start) ? null : Math.max(0, (Date.now() - start) / 1000);
};
