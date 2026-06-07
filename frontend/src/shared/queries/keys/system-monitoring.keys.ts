export const systemMonitoringKeys = {
  all: ["systemMonitoring"] as const,
  combined: () => [...systemMonitoringKeys.all, "combined"] as const,
} as const;
