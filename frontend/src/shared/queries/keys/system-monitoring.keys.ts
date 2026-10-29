export const systemMonitoringKeys = {
  all: ["systemMonitoring"] as const,
  combined: () => [...systemMonitoringKeys.all, "combined"] as const,
  info: () => [...systemMonitoringKeys.all, "info"] as const,
  serverStats: () => [...systemMonitoringKeys.all, "serverStats"] as const,
  network: () => [...systemMonitoringKeys.all, "network"] as const,
} as const;
