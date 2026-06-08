import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { TaskRefResponseDto } from "@/core/dto/task-ref-response.dto";
import { CheckServerAccess } from "@/modules/auth/decorators/check-server-access.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { RequirePermissions } from "@/modules/auth/decorators/require-permissions.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permission.guard";
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
  ApiExtension,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import type { IUser } from "@shared/types/user.types";
import { UserPermissions } from "@shared/types/user.types";
import { ModsService } from "./mods.service";

@ApiTags("Mods")
@ApiBearerAuth()
@Controller("api/mods")
@UseGuards(BearerAuthGuard, PermissionsGuard, ServerAccessGuard)
export class ModsController {
  constructor(private readonly modsService: ModsService) {}

  @Get("search")
  @ApiOperation({ summary: "Search mods on Modrinth" })
  @RequirePermissions(UserPermissions.MANAGE_PLUGINS)
  @ApiExtension("x-permissions", [UserPermissions.MANAGE_PLUGINS])
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
  @RequirePermissions(UserPermissions.MANAGE_PLUGINS)
  @ApiExtension("x-permissions", [UserPermissions.MANAGE_PLUGINS])
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
  @RequirePermissions(UserPermissions.MANAGE_PLUGINS)
  @ApiExtension("x-permissions", [UserPermissions.MANAGE_PLUGINS])
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
  @RequirePermissions(UserPermissions.MANAGE_PLUGINS)
  @ApiExtension("x-permissions", [UserPermissions.MANAGE_PLUGINS])
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
  @RequirePermissions(UserPermissions.MANAGE_PLUGINS)
  @ApiExtension("x-permissions", [UserPermissions.MANAGE_PLUGINS])
  @CheckServerAccess("serverId")
  @ApiBody({ type: InstallPluginDto })
  @ApiAcceptedResponse({
    type: TaskRefResponseDto,
    description: "Background install task started",
  })
  @ApiErrorResponses()
  install(
    @Body() dto: InstallPluginDto,
    @CurrentUser() user: IUser,
  ): Promise<TaskRefResponseDto> {
    return this.modsService.installPlugin(user.id, dto);
  }

  @Post("servers/:serverId/mods/:modId/update")
  @HttpCode(202)
  @ApiOperation({ summary: "Update installed mod to another version" })
  @RequirePermissions(UserPermissions.MANAGE_PLUGINS)
  @ApiExtension("x-permissions", [UserPermissions.MANAGE_PLUGINS])
  @CheckServerAccess("serverId")
  @ApiParam({ name: "serverId", description: "Server ID" })
  @ApiParam({ name: "modId", description: "Installed mod record ID" })
  @ApiAcceptedResponse({
    type: TaskRefResponseDto,
    description: "Background update task started",
  })
  @ApiErrorResponses()
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
  @RequirePermissions(UserPermissions.MANAGE_PLUGINS)
  @ApiExtension("x-permissions", [UserPermissions.MANAGE_PLUGINS])
  @CheckServerAccess("serverId")
  @ApiParam({ name: "serverId", description: "Server ID" })
  @ApiParam({ name: "modId", description: "Installed mod record ID" })
  @ApiAcceptedResponse({
    type: TaskRefResponseDto,
    description: "Background remove task started",
  })
  @ApiErrorResponses()
  remove(
    @Param("serverId") serverId: string,
    @Param("modId") modId: string,
    @Body() dto: RemovePluginDto,
    @CurrentUser() user: IUser,
  ): Promise<TaskRefResponseDto> {
    return this.modsService.removePlugin(user.id, serverId, modId, dto);
  }
}
