import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type { ILogFile, ILogSearchResult } from "../types";

export class ServerLogsApi {
  constructor(private authHttp: AuthHttpClient) {}

  list = (serverId: string): Promise<ILogFile[]> =>
    this.authHttp.get<ILogFile[]>(`server-logs/${serverId}`);

  content = (
    serverId: string,
    file: string,
    tail?: number
  ): Promise<string> => {
    const params = new URLSearchParams({ file });
    if (tail) params.set("tail", String(tail));
    return this.authHttp.get<string>(
      `server-logs/${serverId}/content?${params.toString()}`
    );
  };

  search = (
    serverId: string,
    file: string,
    q: string
  ): Promise<ILogSearchResult[]> => {
    const params = new URLSearchParams({ file, q });
    return this.authHttp.get<ILogSearchResult[]>(
      `server-logs/${serverId}/search?${params.toString()}`
    );
  };
}

export const serverLogsApi = new ServerLogsApi(authHttp);
