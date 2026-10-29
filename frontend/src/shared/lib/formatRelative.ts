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
  const days = Math.round(abs / 86_400_000);
  if (days < 30)
    return RELATIVE_FORMATTER.format(Math.round(diff / 86_400_000), "day");
  if (days < 365)
    return RELATIVE_FORMATTER.format(Math.round(diff / 2_592_000_000), "month");
  return RELATIVE_FORMATTER.format(Math.round(diff / 31_536_000_000), "year");
}
