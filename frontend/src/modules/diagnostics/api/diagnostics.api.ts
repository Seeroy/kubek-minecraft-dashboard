import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type { IServerDiagnostic } from "@shared/types/server/instance.types";

export class DiagnosticsApi {
  constructor(private authHttp: AuthHttpClient) {}

  getForServer = (serverId: string): Promise<IServerDiagnostic[]> =>
    this.authHttp.get<IServerDiagnostic[]>(`servers/${serverId}/diagnostics`);
}

export const diagnosticsApi = new DiagnosticsApi(authHttp);
