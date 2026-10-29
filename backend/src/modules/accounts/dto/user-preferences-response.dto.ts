import { ApiProperty } from "@nestjs/swagger";

/** Current user's editable preferences (2FA primary, dashboard, avatar) */
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
    description: "Persisted dashboard layout as serialized JSON, or null",
    nullable: true,
    required: false,
    type: String,
  })
  dashboardLayout?: string | null;

  @ApiProperty({
    description: "Panel version for which the what's-new modal was last seen",
    nullable: true,
    required: false,
    example: "4.0.0",
  })
  lastSeenWhatsNewVersion: string | null;

  @ApiProperty({
    description:
      "Minecraft nickname used for the avatar, null to use the username",
    nullable: true,
    type: String,
    example: "Notch",
  })
  skinName: string | null;

  @ApiProperty({
    description: "Current running panel version",
    example: "4.0.0",
  })
  panelVersion: string;
}
