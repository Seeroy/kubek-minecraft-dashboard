import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type { MetricsPoint, MetricsWindow } from "../types";

export class MetricsHistoryApi {
  constructor(private authHttp: AuthHttpClient) {}

  range = (scope: string, window: MetricsWindow): Promise<MetricsPoint[]> =>
    this.authHttp.get<MetricsPoint[]>(
      `metrics-history?scope=${encodeURIComponent(scope)}&window=${window}`
    );
}

export const metricsHistoryApi = new MetricsHistoryApi(authHttp);
