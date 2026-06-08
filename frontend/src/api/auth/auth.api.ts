import {
  authHttp,
  baseHttp,
  type AuthHttpClient,
  type BaseHttpClient,
} from "@/shared/lib/http";
import type {
  ChallengeStatusResponse,
  LoginDto,
  LoginResponseDto,
  SwitchChallengeResponse,
  TwoFactorMethod,
  UserProfile,
  VerifyTotpResponse,
} from "./auth.model";

export class AuthApi {
  constructor(
    private http: BaseHttpClient,
    private authHttp: AuthHttpClient
  ) {}

  login = (data: LoginDto): Promise<LoginResponseDto> =>
    this.http.post<LoginResponseDto>("auth/login", { json: data });

  logout = async (): Promise<void> => {
    await this.authHttp.post<void>("auth/logout");
  };

  getProfile = (): Promise<UserProfile> =>
    this.authHttp.get<UserProfile>("auth/profile");

  completeOOBE = async (): Promise<void> => {
    await this.authHttp.post<void>("auth/complete-oobe");
  };

  // 2FA
  verifyTotpChallenge = (
    challengeId: string,
    code: string
  ): Promise<VerifyTotpResponse> =>
    this.authHttp.post<VerifyTotpResponse>("auth/2fa/totp/verify", {
      json: { challengeId, code },
    });

  switchChallenge = (
    challengeId: string,
    method: TwoFactorMethod
  ): Promise<SwitchChallengeResponse> =>
    this.authHttp.post<SwitchChallengeResponse>("auth/2fa/challenge/switch", {
      json: { challengeId, method },
    });

  pollChallenge = (challengeId: string): Promise<ChallengeStatusResponse> =>
    this.authHttp.get<ChallengeStatusResponse>(
      `auth/2fa/challenge/${challengeId}/status`
    );
}

export const authApi = new AuthApi(baseHttp, authHttp);
