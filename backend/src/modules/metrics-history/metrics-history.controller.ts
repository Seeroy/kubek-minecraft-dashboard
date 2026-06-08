import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { RequirePermissions } from "@/modules/auth/decorators/require-permissions.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permission.guard";
import { MetricPointResponseDto } from "@/modules/metrics-history/dto/metric-point.dto";
import { MetricsRangeQueryDto } from "@/modules/metrics-history/dto/metrics-range.dto";
import { MetricsQueryService } from "@/modules/metrics-history/services/metrics-query.service";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiExtension,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { UserPermissions } from "@shared/types/user.types";

@ApiTags("Metrics history")
@ApiBearerAuth()
@Controller("api/metrics-history")
@UseGuards(BearerAuthGuard, PermissionsGuard)
export class MetricsHistoryController {
  constructor(private readonly query: MetricsQueryService) {}

  @Get()
  @ApiOperation({ summary: "Get metric history for given scope and window" })
  @ApiOkResponse({
    type: [MetricPointResponseDto],
    description: "Metric history series",
  })
  @ApiErrorResponses([400, 401, 403])
  @RequirePermissions(UserPermissions.SYSTEM_MONITORING)
  @ApiExtension("x-permissions", [UserPermissions.SYSTEM_MONITORING])
  get(@Query() q: MetricsRangeQueryDto): MetricPointResponseDto[] {
    return this.query.range(q.scope, q.window);
  }
}
