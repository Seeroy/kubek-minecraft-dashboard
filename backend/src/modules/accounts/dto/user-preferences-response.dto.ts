import { ApiProperty } from "@nestjs/swagger";

/** Current user's editable preferences (2FA primary, notifications, dashboard) */
export class UserPreferencesResponseDto {
  @ApiProperty({
    description: "Primary 2FA method, or null when none is set",
    enum: ["totp", "telegram"],
    nullable: true,
    required: false,
    example: "totp",
  })
  twofaPrimary: "totp" | "telegram" | null;

  @ApiProperty({
    description: "Whether the user receives task-result notifications",
    example: true,
  })
  notifyTaskResults: boolean;

  @ApiProperty({
    description: "Whether TOTP 2FA is enabled",
    required: false,
    example: false,
  })
  totpEnabled?: boolean;

  @ApiProperty({
    description: "Whether Telegram 2FA is enabled",
    required: false,
    example: false,
  })
  telegram2faEnabled?: boolean;

  @ApiProperty({
    description: "Persisted dashboard layout (opaque structure), or null",
    nullable: true,
    required: false,
    type: Object,
  })
  dashboardLayout: unknown;
}
