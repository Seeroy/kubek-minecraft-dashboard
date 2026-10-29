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
import { InstallPluginDto } from "./dto/install-plugin.dto";
import { InstalledContentDto } from "./dto/installed-content.dto";
import {
  ModrinthProjectDto,
  ModrinthSearchResponseDto,
  ModrinthVersionDto,
} from "./dto/modrinth-responses.dto";
import {
  ProjectVersionsQueryDto,
  SearchPluginsDto,
} from "./dto/search-plugins.dto";
import { RemovePluginDto, UpdatePluginDto } from "./dto/update-plugin.dto";
import { PluginsService } from "./plugins.service";

@ApiTags("Plugins")
@ApiBearerAuth()
@Controller("api/plugins")
@UseGuards(BearerAuthGuard, AccessGuard, ServerAccessGuard)
export class PluginsController {
  constructor(private readonly pluginsService: PluginsService) {}

  @Get("search")
  @ApiOperation({ summary: "Search plugins on Modrinth" })
  @RequireAccess(AccessArea.CONTENT, "read")
  @ApiOkResponse({
    type: ModrinthSearchResponseDto,
    description: "Search result",
  })
  @ApiErrorResponses()
  search(@Query() query: SearchPluginsDto): Promise<ModrinthSearchResponseDto> {
    return this.pluginsService.search(query);
  }

  @Get("projects/:projectId")
  @ApiOperation({ summary: "Get plugin project details" })
  @RequireAccess(AccessArea.CONTENT, "read")
  @ApiOkResponse({ type: ModrinthProjectDto, description: "Project details" })
  @ApiErrorResponses()
  @ApiParam({ name: "projectId", description: "Project ID or slug" })
  getProject(
    @Param("projectId") projectId: string,
  ): Promise<ModrinthProjectDto> {
    return this.pluginsService.getProject(projectId);
  }

  @Get("projects/:projectId/versions")
  @ApiOperation({ summary: "List versions of plugin project" })
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
    return this.pluginsService.getProjectVersions(projectId, query);
  }

  @Get("installed/:serverId")
  @ApiOperation({ summary: "List installed plugins for server" })
  @RequireAccess(AccessArea.CONTENT, "read")
  @CheckServerAccess("serverId")
  @ApiParam({ name: "serverId", description: "Server ID" })
  @ApiOkResponse({
    type: [InstalledContentDto],
    description: "Installed plugins",
  })
  @ApiErrorResponses()
  listInstalled(
    @Param("serverId") serverId: string,
  ): Promise<InstalledContentDto[]> {
    return this.pluginsService.listInstalled(serverId);
  }

  @Post("install")
  @HttpCode(202)
  @ApiOperation({ summary: "Install plugin from Modrinth" })
  @RequireAccess(AccessArea.CONTENT, "write")
  @CheckServerAccess("serverId")
  @ApiBody({ type: InstallPluginDto })
  @ApiAcceptedResponse({
    type: TaskRefResponseDto,
    description: "Background install task started",
  })
  @ApiErrorResponses()
  @Audit(contentAudit(AuditAction.CONTENT_INSTALL, "plugin"))
  install(
    @Body() dto: InstallPluginDto,
    @CurrentUser() user: IUser,
  ): Promise<TaskRefResponseDto> {
    return this.pluginsService.installPlugin(user.id, dto);
  }

  @Post("servers/:serverId/plugins/:pluginId/update")
  @HttpCode(202)
  @ApiOperation({ summary: "Update installed plugin to another version" })
  @RequireAccess(AccessArea.CONTENT, "write")
  @CheckServerAccess("serverId")
  @ApiParam({ name: "serverId", description: "Server ID" })
  @ApiParam({ name: "pluginId", description: "Installed plugin record ID" })
  @ApiAcceptedResponse({
    type: TaskRefResponseDto,
    description: "Background update task started",
  })
  @ApiErrorResponses()
  @Audit(contentAudit(AuditAction.CONTENT_UPDATE, "plugin"))
  update(
    @Param("serverId") serverId: string,
    @Param("pluginId") pluginId: string,
    @Body() dto: UpdatePluginDto,
    @CurrentUser() user: IUser,
  ): Promise<TaskRefResponseDto> {
    return this.pluginsService.updatePlugin(user.id, serverId, pluginId, dto);
  }

  @Delete("servers/:serverId/plugins/:pluginId")
  @HttpCode(202)
  @ApiOperation({ summary: "Remove installed plugin" })
  @RequireAccess(AccessArea.CONTENT, "manage")
  @CheckServerAccess("serverId")
  @ApiParam({ name: "serverId", description: "Server ID" })
  @ApiParam({ name: "pluginId", description: "Installed plugin record ID" })
  @ApiAcceptedResponse({
    type: TaskRefResponseDto,
    description: "Background remove task started",
  })
  @ApiErrorResponses()
  @Audit(contentAudit(AuditAction.CONTENT_REMOVE, "plugin"))
  remove(
    @Param("serverId") serverId: string,
    @Param("pluginId") pluginId: string,
    @Body() dto: RemovePluginDto,
    @CurrentUser() user: IUser,
  ): Promise<TaskRefResponseDto> {
    return this.pluginsService.removePlugin(user.id, serverId, pluginId, dto);
  }
}
