import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, Matches } from "class-validator";

export class MetricsRangeQueryDto {
  @ApiProperty({
    description: "Scope: 'system' or 'server:<uuid>'",
    example: "system",
  })
  @IsString()
  @Matches(/^(system|server:[A-Za-z0-9-]+)$/)
  scope!: string;

  @ApiProperty({ enum: ["1h", "6h", "12h", "24h"] })
  @IsIn(["1h", "6h", "12h", "24h"])
  window!: "1h" | "6h" | "12h" | "24h";
}
