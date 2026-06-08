import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

/**
 * DTO for changing account password
 */
export class ChangePasswordDto {
  @ApiProperty({
    description: "Current password",
    example: "oldPassword123",
  })
  @IsString()
  old: string;

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
