import type { ServerProcessStats } from "@/api";

const GIB = 1024 ** 3;

const gb = (bytes: number, locale: string) =>
  new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(bytes / GIB);

export const formatCpu = (stats: ServerProcessStats | undefined) =>
  stats?.cpu == null ? "—" : `${Math.round(stats.cpu)}%`;

/** "4,2 / 10" in GB, the unit is added by the caller */
export function formatMemory(stats: ServerProcessStats | undefined, locale: string) {
  if (!stats) return null;
  const used = gb(stats.memoryBytes, locale);
  return stats.memoryLimitBytes ? { used, limit: gb(stats.memoryLimitBytes, locale) } : { used, limit: null };
}

/** Memory against the launch limit 0..100, null without a known limit */
export const memoryPercent = (stats: ServerProcessStats | undefined) =>
  stats?.memoryLimitBytes ? Math.min(100, (stats.memoryBytes / stats.memoryLimitBytes) * 100) : null;
