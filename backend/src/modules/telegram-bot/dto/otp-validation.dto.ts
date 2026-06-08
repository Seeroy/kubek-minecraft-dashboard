import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

/**
 * DTO for OTP validation response
 */
export class OtpValidationDto {
  @ApiProperty({
    description: "Validation result",
    example: true,
  })
  valid: boolean;

  @ApiProperty({
    description: "Error message if validation failed",
    example: "OTP code expired",
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  error?: string;
}
