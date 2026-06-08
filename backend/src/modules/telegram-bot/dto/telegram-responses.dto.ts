import { ApiProperty } from "@nestjs/swagger";

/** Generated OTP code for Telegram account linking */
export class GenerateOtpResponseDto {
  @ApiProperty({
    description: "One-time code to enter in the bot",
    example: "123456",
  })
  otp: string;
}

/** Telegram bot identity / connectivity status */
export class BotInfoResponseDto {
  @ApiProperty({
    description: "Bot display name (empty when unavailable)",
    example: "Kubek Bot",
  })
  name: string;

  @ApiProperty({
    description: "Bot username (empty when unavailable)",
    example: "kubek_bot",
  })
  username: string;

  @ApiProperty({
    required: false,
    description: "Error message when the bot is unavailable",
  })
  error?: string;
}

/** A Telegram user linked to a Kubek account */
export class LinkedTelegramUserDto {
  @ApiProperty({ description: "Telegram user id", example: 123456789 })
  id: number;

  @ApiProperty({ description: "Kubek user id" })
  userId: string;

  @ApiProperty({ required: false, description: "Telegram username" })
  username?: string;

  @ApiProperty({ required: false, description: "First name" })
  firstName?: string;

  @ApiProperty({ required: false, description: "Last name" })
  lastName?: string;

  @ApiProperty({ description: "Link timestamp (ms epoch)" })
  linkedAt: number;

  @ApiProperty({ description: "Whether the link is active" })
  isActive: boolean;

  @ApiProperty({
    required: false,
    enum: ["en", "ru"],
    description: "Preferred bot language",
  })
  language?: "en" | "ru";
}

/** A linked Telegram user paired with the Kubek account name */
export class LinkedUserResponseDto {
  @ApiProperty({
    type: LinkedTelegramUserDto,
    description: "Linked Telegram user",
  })
  telegramUser: LinkedTelegramUserDto;

  @ApiProperty({ description: "Kubek account username", example: "admin" })
  accountName: string;
}
