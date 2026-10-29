import { ApiProperty } from "@nestjs/swagger";

/** Live resource usage of one running server */
export class ServerProcessStatsDto {
  @ApiProperty({ description: "Server ID" })
  serverId: string;

  @ApiProperty({
    nullable: true,
    type: Number,
    description: "Host pid of the server process, null for containers",
    example: 4570,
  })
  pid: number | null;

  @ApiProperty({
    nullable: true,
    type: Number,
    description: "CPU share of the whole host 0..100, null until a second sample",
    example: 38.5,
  })
  cpu: number | null;

  @ApiProperty({ description: "Resident memory in bytes" })
  memoryBytes: number;

  @ApiProperty({
    nullable: true,
    type: Number,
    description: "Heap limit the server was launched with, in bytes",
  })
  memoryLimitBytes: number | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: "Start time (ISO)",
  })
  startedAt: string | null;
}

/** Live server usage, empty when sampling is turned off */
export class ServerStatsResponseDto {
  @ApiProperty({
    description: "False when sampling is off in settings or by KUBEK_SERVER_STATS=off",
  })
  enabled: boolean;

  @ApiProperty({ type: [ServerProcessStatsDto] })
  servers: ServerProcessStatsDto[];
}
