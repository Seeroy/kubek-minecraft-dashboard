import { ApiProperty } from "@nestjs/swagger";
import { ApiErrorCode } from "./error-codes";

/** A single field-level validation error */
export class ApiErrorDetailDto {
  @ApiProperty({
    description: "Field that failed validation",
    example: "username",
  })
  field: string;

  @ApiProperty({
    description: "Human-readable reason",
    example: "username should not be empty",
  })
  message: string;
}

/** Standard raw REST error body returned by every failed request */
export class ApiErrorBodyDto {
  @ApiProperty({ description: "HTTP status code", example: 400 })
  statusCode: number;

  @ApiProperty({
    description: "Machine-readable error code",
    enum: ApiErrorCode,
    example: ApiErrorCode.BAD_REQUEST,
  })
  code: ApiErrorCode | string;

  @ApiProperty({
    description: "Human-readable error message",
    example: "Validation failed",
  })
  message: string;

  @ApiProperty({
    description: "Field-level details (validation errors)",
    type: [ApiErrorDetailDto],
    required: false,
  })
  details?: ApiErrorDetailDto[];

  @ApiProperty({
    description: "Remaining attempts before lockout (auth flows)",
    required: false,
    example: 2,
  })
  attemptsLeft?: number;

  @ApiProperty({
    description: "ISO timestamp of the error",
    example: "2026-06-04T12:00:00.000Z",
  })
  timestamp: string;

  @ApiProperty({
    description: "Unique request identifier for tracing",
    example: "a1b2c3d4-...",
  })
  requestId: string;

  @ApiProperty({
    description: "Request path that produced the error",
    example: "/api/servers",
  })
  path: string;
}
