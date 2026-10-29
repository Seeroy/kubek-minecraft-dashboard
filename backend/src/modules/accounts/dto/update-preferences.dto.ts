import { ApiProperty } from "@nestjs/swagger";
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from "class-validator";

export class UpdatePreferencesDto {
  @ApiProperty({ enum: ["totp", "telegram"], required: false, nullable: true })
  @IsOptional()
  @IsIn(["totp", "telegram", null])
  twofaPrimary?: "totp" | "telegram" | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Serialized dashboard layout (JSON)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  dashboardLayout?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Panel version for which the what's-new modal was last seen",
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  lastSeenWhatsNewVersion?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      "Minecraft nickname for the avatar, null or empty to use the username",
    example: "Notch",
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== "")
  @Matches(/^[A-Za-z0-9_]{1,16}$/)
  skinName?: string | null;
}
