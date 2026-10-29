import { RequireServerView } from "@/modules/auth/decorators/require-access.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { canSeeServer } from "@shared/access/can";
import type { IUser } from "@shared/types/user.types";
import { ServerStatsResponseDto } from "./dto/server-process-stats.dto";
import { ProcessStatsService } from "./services/process-stats.service";

@ApiTags("Metrics history")
@ApiBearerAuth()
@Controller("api/server-stats")
@UseGuards(BearerAuthGuard, AccessGuard)
export class ServerStatsController {
  constructor(private readonly processStats: ProcessStatsService) {}

  @Get()
  @ApiOperation({ summary: "Live CPU and memory of running servers" })
  @ApiOkResponse({ type: ServerStatsResponseDto })
  @ApiErrorResponses([401, 403])
  @RequireServerView()
  async list(@CurrentUser() user: IUser): Promise<ServerStatsResponseDto> {
    if (!this.processStats.isEnabled()) return { enabled: false, servers: [] };
    const stats = await this.processStats.collect();
    return {
      enabled: true,
      servers: stats.filter((s) => canSeeServer(user, s.serverId)),
    };
  }
}
