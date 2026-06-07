import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length } from "class-validator";

/**
 * DTO for linking Telegram account with OTP
 */
export class LinkTelegramDto {
  @ApiProperty({
    description: "OTP code for linking Telegram account",
    example: "123456",
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}
