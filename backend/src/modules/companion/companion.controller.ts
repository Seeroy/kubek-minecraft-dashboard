import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { Audit, type AuditMeta } from "@/modules/audit-log/audit.decorator";
import { CheckServerAccess } from "@/modules/auth/decorators/check-server-access.decorator";
import {
  RequireAccess,
  RequireServerView,
} from "@/modules/auth/decorators/require-access.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { ServerAccessGuard } from "@/modules/auth/guards/server-access.guard";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { AccessArea } from "@shared/access/areas";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import { CompanionService } from "./companion.service";
import {
  CompanionActivityQueryDto,
  CompanionBroadcastDto,
  CompanionEventsQueryDto,
  CompanionLagReportQueryDto,
  CompanionMaintenanceRequestDto,
  CompanionMetricsQueryDto,
  CompanionTitleDto,
  UpdateCompanionSettingsDto,
} from "./dto/companion-requests.dto";
import {
  CompanionActivityDto,
  CompanionEventsPageDto,
  CompanionInstallResultDto,
  CompanionLagReportDto,
  CompanionLivePluginDto,
  CompanionMaintenanceDto,
  CompanionMetricPointDto,
  CompanionOverviewDto,
  CompanionSettingsDto,
} from "./dto/companion-responses.dto";

// The server comes from the route through @CheckServerAccess
const companionAudit = (action: string): AuditMeta => ({
  action,
  category: AuditCategory.SERVER,
  resourceType: "companion",
});

@ApiTags("Companion")
@ApiBearerAuth()
@ApiParam({ name: "serverId", description: "Server ID" })
@Controller("api/servers/:serverId/companion")
@UseGuards(BearerAuthGuard, AccessGuard, ServerAccessGuard)
@CheckServerAccess("serverId")
export class CompanionController {
  constructor(private readonly companion: CompanionService) {}

  @Get()
  @ApiOperation({ summary: "Plugin install state, live link and settings" })
  @RequireServerView()
  @ApiOkResponse({ type: CompanionOverviewDto })
  @ApiErrorResponses([401, 403, 404])
  overview(@Param("serverId") serverId: string): Promise<CompanionOverviewDto> {
    return this.companion.overview(serverId);
  }

  @Post("install")
  @ApiOperation({
    summary: "Install or update the plugin from GitHub releases",
  })
  @RequireAccess(AccessArea.CONTENT, "write")
  @Audit(companionAudit(AuditAction.COMPANION_INSTALL))
  @ApiOkResponse({ type: CompanionInstallResultDto })
  @ApiErrorResponses([400, 401, 403, 404, 503])
  install(
    @Param("serverId") serverId: string,
  ): Promise<CompanionInstallResultDto> {
    return this.companion.install(serverId);
  }

  @Put("settings")
  @ApiOperation({ summary: "Chat logging and player coordinates" })
  @RequireAccess(AccessArea.SETTINGS, "write")
  @Audit(companionAudit(AuditAction.COMPANION_SETTINGS_UPDATE))
  @ApiOkResponse({ type: CompanionSettingsDto })
  @ApiErrorResponses([400, 401, 403, 404])
  updateSettings(
    @Param("serverId") serverId: string,
    @Body() dto: UpdateCompanionSettingsDto,
  ): CompanionSettingsDto {
    return this.companion.updateSettings(serverId, dto);
  }

  @Get("metrics")
  @ApiOperation({ summary: "TPS, MSPT, heap and online history" })
  @RequireServerView()
  @ApiOkResponse({ type: [CompanionMetricPointDto] })
  @ApiErrorResponses([400, 401, 403, 404])
  metrics(
    @Param("serverId") serverId: string,
    @Query() query: CompanionMetricsQueryDto,
  ): CompanionMetricPointDto[] {
    return this.companion.metricsRange(serverId, query.window);
  }

  @Get("lag-report")
  @ApiOperation({ summary: "Entities, tiles and plugin tasks right now" })
  @RequireServerView()
  @ApiOkResponse({ type: CompanionLagReportDto })
  @ApiErrorResponses([400, 401, 403, 404, 409, 429, 504])
  lagReport(
    @Param("serverId") serverId: string,
    @Query() query: CompanionLagReportQueryDto,
  ): Promise<CompanionLagReportDto> {
    return this.companion.lagReport(serverId, query.limit);
  }

  @Get("plugins")
  @ApiOperation({ summary: "Plugins as the running server sees them" })
  @RequireAccess(AccessArea.CONTENT, "read")
  @ApiOkResponse({ type: [CompanionLivePluginDto] })
  @ApiErrorResponses([401, 403, 404, 409, 504])
  plugins(
    @Param("serverId") serverId: string,
  ): Promise<CompanionLivePluginDto[]> {
    return this.companion.livePlugins(serverId);
  }

  @Get("events")
  @ApiOperation({ summary: "Activity feed, newest first" })
  @RequireAccess(AccessArea.PLAYERS, "read")
  @ApiOkResponse({ type: CompanionEventsPageDto })
  @ApiErrorResponses([400, 401, 403, 404])
  events(
    @Param("serverId") serverId: string,
    @Query() query: CompanionEventsQueryDto,
  ): CompanionEventsPageDto {
    return this.companion.eventsPage(serverId, query);
  }

  @Get("activity")
  @ApiOperation({ summary: "Peak online and top players by time played" })
  @RequireAccess(AccessArea.PLAYERS, "read")
  @ApiOkResponse({ type: CompanionActivityDto })
  @ApiErrorResponses([400, 401, 403, 404])
  activity(
    @Param("serverId") serverId: string,
    @Query() query: CompanionActivityQueryDto,
  ): CompanionActivityDto {
    return this.companion.activity(serverId, query.days);
  }

  @Post("broadcast")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Chat message to everyone online" })
  @RequireAccess(AccessArea.PLAYERS, "write")
  @Audit(companionAudit(AuditAction.COMPANION_BROADCAST))
  @ApiNoContentResponse()
  @ApiErrorResponses([400, 401, 403, 404, 409, 504])
  async broadcast(
    @Param("serverId") serverId: string,
    @Body() dto: CompanionBroadcastDto,
  ): Promise<void> {
    await this.companion.broadcast(serverId, dto.message);
  }

  @Post("title")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Title on every player's screen" })
  @RequireAccess(AccessArea.PLAYERS, "write")
  @Audit(companionAudit(AuditAction.COMPANION_TITLE))
  @ApiNoContentResponse()
  @ApiErrorResponses([400, 401, 403, 404, 409, 504])
  async title(
    @Param("serverId") serverId: string,
    @Body() dto: CompanionTitleDto,
  ): Promise<void> {
    await this.companion.title(serverId, dto.title, dto.subtitle, dto.seconds);
  }

  @Put("maintenance")
  @ApiOperation({ summary: "Maintenance mode, only allowed players can join" })
  @RequireAccess(AccessArea.PLAYERS, "manage")
  @Audit(companionAudit(AuditAction.COMPANION_MAINTENANCE))
  @ApiOkResponse({ type: CompanionMaintenanceDto })
  @ApiErrorResponses([400, 401, 403, 404, 409, 504])
  maintenance(
    @Param("serverId") serverId: string,
    @Body() dto: CompanionMaintenanceRequestDto,
  ): Promise<CompanionMaintenanceDto> {
    return this.companion.setMaintenance(serverId, dto);
  }
}
