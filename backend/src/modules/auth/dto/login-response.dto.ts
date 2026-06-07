import { PublicUserDto } from "@/core/dto/public-user.dto";
import { ApiProperty } from "@nestjs/swagger";

export class LoginResponseDto {
  @ApiProperty({
    type: PublicUserDto,
    required: false,
    description: "User profile (only when not 2FA gated)",
  })
  user?: PublicUserDto;

  @ApiProperty({
    required: false,
    description: "Bearer token (only when not 2FA gated)",
  })
  token?: string;

  @ApiProperty({
    required: false,
    description: "True when a 2FA challenge is required to finish login",
  })
  require2fa?: boolean;

  @ApiProperty({
    required: false,
    description: "ID of the created 2FA challenge",
  })
  challengeId?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    enum: ["totp", "telegram"],
    description: "Preferred 2FA method",
  })
  primary?: "totp" | "telegram" | null;

  @ApiProperty({
    required: false,
    isArray: true,
    enum: ["totp", "telegram"],
    description: "Available 2FA methods for this account",
  })
  methods?: ("totp" | "telegram")[];

  @ApiProperty({
    required: false,
    description: "Challenge expiry timestamp (ms epoch)",
  })
  expiresAt?: number;
}
