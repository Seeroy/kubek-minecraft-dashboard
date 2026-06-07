import { ApiProperty } from "@nestjs/swagger";

/** A single point in a metric history series */
export class MetricPointResponseDto {
  @ApiProperty({ description: "Timestamp (epoch ms)", example: 1717500000000 })
  ts: number;

  @ApiProperty({ description: "CPU usage percent", example: 42.5 })
  cpu: number;

  @ApiProperty({ description: "RAM used (MB)", example: 1024 })
  ramUsed: number;

  @ApiProperty({ description: "RAM total (MB)", example: 4096 })
  ramTotal: number;
}
