import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { canSeeServer } from "@shared/access/can";
import type { IUser } from "@shared/types/user.types";
import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { MetricPointResponseDto } from "@/modules/metrics-history/dto/metric-point.dto";
import { MetricsRangeQueryDto } from "@/modules/metrics-history/dto/metrics-range.dto";
import { MetricsQueryService } from "@/modules/metrics-history/services/metrics-query.service";
import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AccessArea } from "@shared/access/areas";

@ApiTags("Metrics history")
@ApiBearerAuth()
@Controller("api/metrics-history")
@UseGuards(BearerAuthGuard, AccessGuard)
export class MetricsHistoryController {
  constructor(private readonly query: MetricsQueryService) {}

  @Get()
  @ApiOperation({ summary: "Get metric history for given scope and window" })
  @ApiOkResponse({
    type: [MetricPointResponseDto],
    description: "Metric history series",
  })
  @ApiErrorResponses([400, 401, 403])
  @RequireAccess(AccessArea.MONITORING, "read")
  get(
    @Query() q: MetricsRangeQueryDto,
    @CurrentUser() user: IUser,
  ): MetricPointResponseDto[] {
    // A server scope also needs that server to be visible
    const serverId = q.scope.startsWith("server:") ? q.scope.slice(7) : null;
    if (serverId && !canSeeServer(user, serverId)) {
      throw new ForbiddenException(`Access to server ${serverId} denied`);
    }
    return this.query.range(q.scope, q.window);
  }
}
