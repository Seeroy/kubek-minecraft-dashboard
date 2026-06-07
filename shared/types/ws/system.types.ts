export type WsMetricsData = {
  cpu: number;
  memory: {
    total: number;
    free: number;
  };
  timestamp?: Date;
};
