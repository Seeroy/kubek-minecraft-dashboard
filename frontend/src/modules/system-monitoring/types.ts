// "now" is the client side live buffer, the rest is server side history
export type MetricsWindow = "now" | "1h" | "6h" | "12h" | "24h";

export interface MetricsPoint {
  ts: number;
  cpu: number;
  ramUsed: number;
  ramTotal: number;
}
