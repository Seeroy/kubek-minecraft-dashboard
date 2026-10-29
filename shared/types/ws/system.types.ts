export type WsMetricsData = {
  cpu: number;
  memory: {
    total: number;
    free: number;
  };
  // ISO string from the broadcaster
  timestamp?: string;
};
