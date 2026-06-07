import { ApiProperty } from "@nestjs/swagger";

export class CpuUsageDto {
  @ApiProperty({
    description: "CPU usage percent",
  })
  cpu: number;

  @ApiProperty({
    description: "Memory usage information",
  })
  memory: { total: number; free: number };
}
