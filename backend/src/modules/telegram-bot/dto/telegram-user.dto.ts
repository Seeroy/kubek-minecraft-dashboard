import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

/**
 * DTO for Telegram user information
 */
export class TelegramUserDto {
  @ApiProperty({
    description: "Telegram user ID",
    example: "123456789",
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: "Telegram username",
    example: "john_doe",
    required: false,
  })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({
    description: "Telegram first name",
    example: "John",
    required: false,
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    description: "Telegram last name",
    example: "Doe",
    required: false,
  })
  @IsString()
  @IsOptional()
  lastName?: string;
}
