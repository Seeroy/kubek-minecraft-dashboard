import { Public } from "@/modules/auth/decorators/public.decorator";
import { SqliteProvider } from "@/modules/database/sqlite.provider";
import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { HealthDto } from "./dto/health.dto";

@ApiTags("Health")
@Controller("api/health")
export class HealthController {
  constructor(private readonly sqlite: SqliteProvider) {}

  /**
   * Health check for Docker and load balancers
   * Public, so it shows nothing sensitive
   */
  @Get()
  @Public()
  @ApiOperation({ summary: "Panel and database health" })
  @ApiResponse({ status: 200, description: "Healthy", type: HealthDto })
  @ApiResponse({ status: 503, description: "Unhealthy", type: HealthDto })
  check(@Res({ passthrough: true }) res: Response): HealthDto {
    let db: HealthDto["db"] = "ok";
    try {
      this.sqlite.connection.query("SELECT 1").get();
    } catch {
      db = "error";
    }
    const status = db === "ok" ? "ok" : "error";
    res.status(
      status === "ok" ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE,
    );
    res.setHeader("Cache-Control", "no-store");
    return { status, db, uptime: Math.round(process.uptime()) };
  }
}
