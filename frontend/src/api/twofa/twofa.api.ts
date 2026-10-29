import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type {
  TotpSetupResponse,
  TwofaStatus,
} from "./twofa.model";

export class TwofaApi {
  constructor(private authHttp: AuthHttpClient) {}

  status = (): Promise<TwofaStatus> =>
    this.authHttp.get<TwofaStatus>("auth/2fa/status");

  setupTotp = (): Promise<TotpSetupResponse> =>
    this.authHttp.post<TotpSetupResponse>("auth/2fa/totp/setup");

  confirmTotp = (setupToken: string, code: string): Promise<void> =>
    this.authHttp.post<void>("auth/2fa/totp/confirm", {
      json: { setupToken, code },
    });

  disableTotp = (password: string): Promise<void> =>
    this.authHttp.post<void>("auth/2fa/totp/disable", {
      json: { password },
    });

  enableTelegram = (): Promise<void> =>
    this.authHttp.post<void>("auth/2fa/telegram/enable");

  disableTelegram = (): Promise<void> =>
    this.authHttp.post<void>("auth/2fa/telegram/disable");
}

export const twofaApi = new TwofaApi(authHttp);
