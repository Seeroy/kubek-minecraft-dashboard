import { PublicUserDto } from "@/core/dto/public-user.dto";
import { ApiProperty } from "@nestjs/swagger";

/** Result of verifying a TOTP code for an active challenge - issues a session token */
export class VerifyTotpResponseDto {
  @ApiProperty({ description: "Session token", example: "a1b2c3..." })
  token: string;

  @ApiProperty({ type: PublicUserDto })
  user: PublicUserDto;
}

/** Result of switching an active challenge to another 2FA method */
export class SwitchChallengeResponseDto {
  @ApiProperty({ description: "New challenge ID", example: "chal_123" })
  challengeId: string;

  @ApiProperty({
    description: "Active method for the new challenge",
    enum: ["totp", "telegram"],
    example: "telegram",
  })
  method: "totp" | "telegram";

  @ApiProperty({
    description: "Challenge expiry as epoch milliseconds",
    example: 1735689600000,
  })
  expiresAt: number;
}

/** Poll result for a 2FA challenge; token+user are present only when approved */
export class PollChallengeResponseDto {
  @ApiProperty({
    description: "Current challenge status",
    enum: ["pending", "approved", "denied", "expired"],
    example: "pending",
  })
  status: "pending" | "approved" | "denied" | "expired";

  @ApiProperty({
    description: "Session token, present only when status is 'approved'",
    required: false,
    example: "a1b2c3...",
  })
  token?: string;

  @ApiProperty({
    description: "User profile, present only when status is 'approved'",
    required: false,
    type: PublicUserDto,
  })
  user?: PublicUserDto;
}

/** Current user's 2FA status across all methods */
export class TwofaStatusResponseDto {
  @ApiProperty({ description: "Whether TOTP 2FA is enabled", example: false })
  totpEnabled: boolean;

  @ApiProperty({
    description: "Whether Telegram 2FA is enabled",
    example: false,
  })
  telegramEnabled: boolean;

  @ApiProperty({
    description: "Primary 2FA method, or null when none is set",
    enum: ["totp", "telegram"],
    nullable: true,
    example: "totp",
  })
  primary: "totp" | "telegram" | null;

  @ApiProperty({
    description: "Enabled 2FA methods",
    enum: ["totp", "telegram"],
    isArray: true,
    example: ["totp"],
  })
  methods: ("totp" | "telegram")[];
}

/** New TOTP setup material (secret + QR) returned when beginning enrollment */
export class BeginTotpResponseDto {
  @ApiProperty({
    description: "Base32 TOTP secret",
    example: "JBSWY3DPEHPK3PXP",
  })
  secret: string;

  @ApiProperty({
    description: "otpauth:// provisioning URI",
    example: "otpauth://totp/Kubek:admin?secret=...",
  })
  otpauthUrl: string;

  @ApiProperty({
    description: "QR code as a data URL",
    example: "data:image/png;base64,...",
  })
  qrDataUrl: string;

  @ApiProperty({
    description: "Signed token binding this setup attempt",
    example: "eyJ...base64url.sig",
  })
  setupToken: string;
}
