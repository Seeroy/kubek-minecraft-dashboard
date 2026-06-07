export const metricsHistoryKeys = {
  all: ["metricsHistory"] as const,
  range: (scope: string, window: string) =>
    [...metricsHistoryKeys.all, scope, window] as const,
} as const;
