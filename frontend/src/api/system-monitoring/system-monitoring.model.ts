import type { components } from "../types";

export type SystemInfo = components["schemas"]["SystemInfoDto"];
export type DiskInfo = components["schemas"]["DiskInfoDto"];
export type CpuUsage = components["schemas"]["CpuUsageDto"];
export type NetworkInfo = components["schemas"]["NetworkInfoDto"];
export type CombinedMonitoringData =
  components["schemas"]["CombinedMonitoringDto"];
export type ServerProcessStats = components["schemas"]["ServerProcessStatsDto"];
export type ServerStatsResponse = components["schemas"]["ServerStatsResponseDto"];
