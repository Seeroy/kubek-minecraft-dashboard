import type { components } from "../types";

export type LoginDto = components["schemas"]["LoginDto"];
export type LoginResponseDto = components["schemas"]["LoginResponseDto"];
export type UserProfile = components["schemas"]["PublicUserDto"];
export type ChallengeStatusResponse =
  components["schemas"]["PollChallengeResponseDto"];
export type VerifyTotpResponse = components["schemas"]["VerifyTotpResponseDto"];
export type SwitchChallengeResponse =
  components["schemas"]["SwitchChallengeResponseDto"];

/** Available 2FA methods */
export type TwoFactorMethod = "totp" | "telegram";
