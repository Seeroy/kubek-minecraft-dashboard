import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length, Matches } from "class-validator";

export class VerifyTotpDto {
  @ApiProperty({ description: "Challenge id received from /auth/login" })
  @IsString()
  challengeId!: string;

  @ApiProperty({ description: "6-digit TOTP code" })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code!: string;
}
