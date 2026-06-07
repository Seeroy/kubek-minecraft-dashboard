const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});

/** Human-friendly relative time; falls back to justNowLabel under a minute */
export function formatRelative(
  timestamp: number,
  justNowLabel: string
): string {
  const diff = timestamp - Date.now();
  const abs = Math.abs(diff);
  const minutes = Math.round(abs / 60_000);
  if (minutes < 1) return justNowLabel;
  if (minutes < 60)
    return RELATIVE_FORMATTER.format(Math.round(diff / 60_000), "minute");
  const hours = Math.round(abs / 3_600_000);
  if (hours < 24)
    return RELATIVE_FORMATTER.format(Math.round(diff / 3_600_000), "hour");
  return RELATIVE_FORMATTER.format(Math.round(diff / 86_400_000), "day");
}
