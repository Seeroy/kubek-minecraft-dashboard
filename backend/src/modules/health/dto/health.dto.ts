import { ApiProperty } from "@nestjs/swagger";

/** Panel and database status */
export class HealthDto {
  @ApiProperty({
    description: "Overall state, error when a dependency is down",
    enum: ["ok", "error"],
    example: "ok",
  })
  status: "ok" | "error";

  @ApiProperty({
    description: "Database reachability",
    enum: ["ok", "error"],
    example: "ok",
  })
  db: "ok" | "error";

  @ApiProperty({ description: "Process uptime in seconds", example: 3600 })
  uptime: number;
}
