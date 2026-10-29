import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { AccessArea } from "@shared/access/areas";
import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { TaskRefResponseDto } from "@/core/dto/task-ref-response.dto";
import { Audit } from "@/modules/audit-log/audit.decorator";
import { contentAudit } from "@/modules/plugins/content.audit";
import { CheckServerAccess } from "@/modules/auth/decorators/check-server-access.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { ServerAccessGuard } from "@/modules/auth/guards/server-access.guard";
import { InstallPluginDto } from "@/modules/plugins/dto/install-plugin.dto";
import { InstalledContentDto } from "@/modules/plugins/dto/installed-content.dto";
import {
  ModrinthProjectDto,
  ModrinthSearchResponseDto,
  ModrinthVersionDto,
} from "@/modules/plugins/dto/modrinth-responses.dto";
import {
  ProjectVersionsQueryDto,
  SearchPluginsDto,
} from "@/modules/plugins/dto/search-plugins.dto";
import {
  RemovePluginDto,
  UpdatePluginDto,
} from "@/modules/plugins/dto/update-plugin.dto";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction } from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";
import { ModsService } from "./mods.service";

@ApiTags("Mods")
@ApiBearerAuth()
@Controller("api/mods")
@UseGuards(BearerAuthGuard, AccessGuard, ServerAccessGuard)
export class ModsController {
  constructor(private readonly modsService: ModsService) {}

  @Get("search")
  @ApiOperation({ summary: "Search mods on Modrinth" })
  @RequireAccess(AccessArea.CONTENT, "read")
  @ApiOkResponse({
    type: ModrinthSearchResponseDto,
    description: "Search result",
  })
  @ApiErrorResponses()
  search(@Query() query: SearchPluginsDto): Promise<ModrinthSearchResponseDto> {
    return this.modsService.search(query);
  }

  @Get("projects/:projectId")
  @ApiOperation({ summary: "Get mod project details" })
  @RequireAccess(AccessArea.CONTENT, "read")
  @ApiOkResponse({ type: ModrinthProjectDto, description: "Project details" })
  @ApiErrorResponses()
  @ApiParam({ name: "projectId", description: "Project ID or slug" })
  getProject(
    @Param("projectId") projectId: string,
  ): Promise<ModrinthProjectDto> {
    return this.modsService.getProject(projectId);
  }

  @Get("projects/:projectId/versions")
  @ApiOperation({ summary: "List versions of mod project" })
  @RequireAccess(AccessArea.CONTENT, "read")
  @ApiOkResponse({
    type: [ModrinthVersionDto],
    description: "Project versions",
  })
  @ApiErrorResponses()
  @ApiParam({ name: "projectId", description: "Project ID or slug" })
  listProjectVersions(
    @Param("projectId") projectId: string,
    @Query() query: ProjectVersionsQueryDto,
  ): Promise<ModrinthVersionDto[]> {
    return this.modsService.getProjectVersions(projectId, query);
  }

  @Get("installed/:serverId")
  @ApiOperation({ summary: "List installed mods for server" })
  @RequireAccess(AccessArea.CONTENT, "read")
  @CheckServerAccess("serverId")
  @ApiParam({ name: "serverId", description: "Server ID" })
  @ApiOkResponse({ type: [InstalledContentDto], description: "Installed mods" })
  @ApiErrorResponses()
  listInstalled(
    @Param("serverId") serverId: string,
  ): Promise<InstalledContentDto[]> {
    return this.modsService.listInstalled(serverId);
  }

  @Post("install")
  @HttpCode(202)
  @ApiOperation({ summary: "Install mod from Modrinth" })
  @RequireAccess(AccessArea.CONTENT, "write")
  @CheckServerAccess("serverId")
  @ApiBody({ type: InstallPluginDto })
  @ApiAcceptedResponse({
    type: TaskRefResponseDto,
    description: "Background install task started",
  })
  @ApiErrorResponses()
  @Audit(contentAudit(AuditAction.CONTENT_INSTALL, "mod"))
  install(
    @Body() dto: InstallPluginDto,
    @CurrentUser() user: IUser,
  ): Promise<TaskRefResponseDto> {
    return this.modsService.installPlugin(user.id, dto);
  }

  @Post("servers/:serverId/mods/:modId/update")
  @HttpCode(202)
  @ApiOperation({ summary: "Update installed mod to another version" })
  @RequireAccess(AccessArea.CONTENT, "write")
  @CheckServerAccess("serverId")
  @ApiParam({ name: "serverId", description: "Server ID" })
  @ApiParam({ name: "modId", description: "Installed mod record ID" })
  @ApiAcceptedResponse({
    type: TaskRefResponseDto,
    description: "Background update task started",
  })
  @ApiErrorResponses()
  @Audit(contentAudit(AuditAction.CONTENT_UPDATE, "mod"))
  update(
    @Param("serverId") serverId: string,
    @Param("modId") modId: string,
    @Body() dto: UpdatePluginDto,
    @CurrentUser() user: IUser,
  ): Promise<TaskRefResponseDto> {
    return this.modsService.updatePlugin(user.id, serverId, modId, dto);
  }

  @Delete("servers/:serverId/mods/:modId")
  @HttpCode(202)
  @ApiOperation({ summary: "Remove installed mod" })
  @RequireAccess(AccessArea.CONTENT, "manage")
  @CheckServerAccess("serverId")
  @ApiParam({ name: "serverId", description: "Server ID" })
  @ApiParam({ name: "modId", description: "Installed mod record ID" })
  @ApiAcceptedResponse({
    type: TaskRefResponseDto,
    description: "Background remove task started",
  })
  @ApiErrorResponses()
  @Audit(contentAudit(AuditAction.CONTENT_REMOVE, "mod"))
  remove(
    @Param("serverId") serverId: string,
    @Param("modId") modId: string,
    @Body() dto: RemovePluginDto,
    @CurrentUser() user: IUser,
  ): Promise<TaskRefResponseDto> {
    return this.modsService.removePlugin(user.id, serverId, modId, dto);
  }
}
