import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type {
  TotpSetupResponse,
  TwofaStatus,
  UpdatePreferencesDto,
  UserPreferences,
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

  getPreferences = (): Promise<UserPreferences> =>
    this.authHttp.get<UserPreferences>("accounts/me/preferences");

  updatePreferences = (data: UpdatePreferencesDto): Promise<UserPreferences> =>
    this.authHttp.patch<UserPreferences>("accounts/me/preferences", {
      json: data,
    });
}

export const twofaApi = new TwofaApi(authHttp);
