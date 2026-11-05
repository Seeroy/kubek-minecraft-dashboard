import type { CompanionMetricsWindow } from "@/api";

export const companionKeys = {
  all: ["companion"] as const,
  overview: (serverId: string) => [...companionKeys.all, "overview", serverId] as const,
  metrics: (serverId: string, window: CompanionMetricsWindow) => [...companionKeys.all, "metrics", serverId, window] as const,
  events: (serverId: string, types: string, q = "") => [...companionKeys.all, "events", serverId, types, q] as const,
  activity: (serverId: string, days: number) => [...companionKeys.all, "activity", serverId, days] as const,
  lagReport: (serverId: string) => [...companionKeys.all, "lag-report", serverId] as const,
} as const;
