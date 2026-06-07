import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString } from "class-validator";

export class SwitchChallengeDto {
  @ApiProperty({ description: "Challenge id received from /auth/login" })
  @IsString()
  challengeId!: string;

  @ApiProperty({ enum: ["totp", "telegram"] })
  @IsIn(["totp", "telegram"])
  method!: "totp" | "telegram";
}
