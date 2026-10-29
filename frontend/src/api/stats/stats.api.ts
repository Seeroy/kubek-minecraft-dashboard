import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type { ClientPrefs } from "./stats.model";

/** Anonymous usage statistics */
export class StatsApi {
  constructor(private authHttp: AuthHttpClient) {}

  reportClient = (data: ClientPrefs): Promise<void> =>
    this.authHttp.post<void>("stats/client", { json: data });
}

export const statsApi = new StatsApi(authHttp);
