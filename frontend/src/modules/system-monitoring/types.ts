export type MetricsWindow = "now" | "1h" | "6h" | "12h" | "24h";

// Server-side history is available only for these windows. "now" is a client-side buffer
export type HistoryWindow = Exclude<MetricsWindow, "now">;

export interface MetricsPoint {
  ts: number;
  cpu: number;
  ramUsed: number;
  ramTotal: number;
}

export type MetricScope = "system" | `server:${string}`;

export const systemScope = (): MetricScope => "system";
export const serverScope = (serverId: string): MetricScope =>
  `server:${serverId}`;
