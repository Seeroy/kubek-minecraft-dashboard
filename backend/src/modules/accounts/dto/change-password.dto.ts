import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

/**
 * DTO for changing account password
 */
export class ChangePasswordDto {
  @ApiProperty({
    required: false,
    description: "Current password, not needed with an API key",
    example: "oldPassword123",
  })
  @IsOptional()
  @IsString()
  old?: string;

  @ApiProperty({
    description: "New password",
    example: "newSecurePassword123",
    minLength: 6,
    maxLength: 64,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  new: string;
}
