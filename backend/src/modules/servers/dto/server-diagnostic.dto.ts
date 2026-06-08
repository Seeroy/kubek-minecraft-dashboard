import { ApiProperty } from "@nestjs/swagger";
import type { ServerDiagnosticSeverity } from "@shared/types/server/instance.types";

/** A recognized error / health issue recorded for a server instance */
export class ServerDiagnosticDto {
  @ApiProperty({ description: "Recognized error type", example: "PORT_IN_USE" })
  errorType: string;

  @ApiProperty({ enum: ["critical", "high", "medium", "low"], example: "high" })
  severity: ServerDiagnosticSeverity;

  @ApiProperty({
    description: "ISO timestamp",
    example: "2026-06-04T12:00:00.000Z",
  })
  timestamp: string;
}
