import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RamUsageDto {
  @ApiProperty({
    description: "Total RAM in bytes",
    example: 17179869184,
  })
  total: number;

  @ApiProperty({
    description: "Used RAM in bytes",
    example: 8589934592,
  })
  used: number;

  @ApiProperty({
    description: "Available RAM in bytes",
    example: 8589934592,
  })
  available: number;

  @ApiProperty({
    description: "RAM usage percentage",
    example: 50,
  })
  percentage: number;

  @ApiPropertyOptional({
    description: "Total swap space in bytes",
    example: 2147483648,
  })
  swapTotal?: number;

  @ApiPropertyOptional({
    description: "Used swap space in bytes",
    example: 1073741824,
  })
  swapUsed?: number;
}
