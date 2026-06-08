import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type { SessionPublicView } from "./sessions.model";

export class SessionsApi {
  constructor(private authHttp: AuthHttpClient) {}

  list = (): Promise<SessionPublicView[]> =>
    this.authHttp.get<SessionPublicView[]>("sessions");

  revoke = async (id: string): Promise<void> => {
    await this.authHttp.delete<void>(`sessions/${id}`);
  };

  revokeAllExceptCurrent = async (): Promise<void> => {
    await this.authHttp.delete<void>("sessions");
  };
}

export const sessionsApi = new SessionsApi(authHttp);
