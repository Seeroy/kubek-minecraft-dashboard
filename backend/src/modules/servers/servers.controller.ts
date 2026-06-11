import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { Audit } from "@/modules/audit-log/audit.decorator";
import { CheckServerAccess } from "@/modules/auth/decorators/check-server-access.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { RequirePermissions } from "@/modules/auth/decorators/require-permissions.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permission.guard";
import { ServerAccessGuard } from "@/modules/auth/guards/server-access.guard";
import { BulkDeleteResultDto } from "@/modules/servers/dto/bulk-delete-result.dto";
import { BulkDeleteServersDto } from "@/modules/servers/dto/bulk-delete-servers.dto";
import { ChangeServerCoreDto } from "@/modules/servers/dto/change-server-core.dto";
import { CreateServerDto } from "@/modules/servers/dto/create-server.dto";
import { DeleteServerDto } from "@/modules/servers/dto/delete-server.dto";
import { DuplicateServerDto } from "@/modules/servers/dto/duplicate-server.dto";
import { ServerCreatedResponseDto } from "@/modules/servers/dto/server-created-response.dto";
import { ServerDiagnosticDto } from "@/modules/servers/dto/server-diagnostic.dto";
import { ServerPropertiesDto } from "@/modules/servers/dto/server-properties.dto";
import { ServerEntity } from "@/modules/servers/dto/server.entity";
import { UpdateServerSettingsDto } from "@/modules/servers/dto/update-server-settings.dto";
import { ServersService } from "@/modules/servers/servers.service";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtension,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";
import { UserPermissions } from "@shared/types/user.types";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { existsSync } from "fs";
import { memoryStorage } from "multer";
import { join } from "path";

@ApiTags("Servers")
@ApiBearerAuth()
@Controller("api/servers")
@UseGuards(BearerAuthGuard, PermissionsGuard, ServerAccessGuard)
export class ServersController {
  constructor(private readonly servers: ServersService) {}

  /** List all servers */
  @Get()
  @ApiOperation({ summary: "List servers" })
  @ApiOkResponse({ type: [ServerEntity], description: "List of servers" })
  @ApiErrorResponses([401, 403])
  @RequirePermissions(UserPermissions.SERVERS_VIEW)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_VIEW])
  getAll(): ServerEntity[] {
    return this.servers.findAll();
  }

  /** Get server by ID */
  @Get(":id")
  @ApiOperation({ summary: "Get server" })
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiOkResponse({ type: ServerEntity, description: "Server entity" })
  @ApiErrorResponses([401, 403, 404])
  @CheckServerAccess("id")
  @RequirePermissions(UserPermissions.SERVERS_VIEW)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_VIEW])
  getById(@Param("id") id: string): ServerEntity {
    const server = this.servers.findById(id);
    if (!server) throw new NotFoundException("Server not found");
    return server;
  }

  /** Create a new server */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Create server" })
  @ApiAcceptedResponse({
    type: ServerCreatedResponseDto,
    description: "Server creation started",
  })
  @ApiErrorResponses([400, 401, 403])
  @RequirePermissions(UserPermissions.CREATE_SERVERS)
  @ApiExtension("x-permissions", [UserPermissions.CREATE_SERVERS])
  @Audit({
    action: AuditAction.SERVER_CREATE,
    category: AuditCategory.SERVER,
    resourceType: "server",
    resolve: ({ result }) => ({
      resourceId: result?.server?.id,
      resourceName: result?.server?.name,
    }),
  })
  @UseInterceptors(
    FileInterceptor("coreFile", {
      storage: memoryStorage(),
      limits: { fileSize: 1024 * 1024 * 512 },
    }),
  )
  @ApiConsumes("multipart/form-data")
  // The payload field is a JSON-stringified CreateServerDto
  @ApiExtraModels(CreateServerDto)
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        payload: {
          type: "string",
          description: "JSON string containing CreateServerDto payload",
          example: JSON.stringify({
            name: "My server",
            blueprintId: "com.kubek.paper",
            variables: {
              GAME_VERSION: "1.21.1",
              XMX: 2048,
              JAVA_VERSION: 21,
              game: 25565,
            },
          }),
        },
        coreFile: {
          type: "string",
          format: "binary",
          description:
            "Custom core JAR file (required for the com.kubek.custom blueprint)",
        },
      },
      required: ["payload"],
    },
  })
  create(
    @Body("payload") payload: string,
    @UploadedFile() coreFile: Express.Multer.File,
    @CurrentUser() user: IUser,
  ): ServerCreatedResponseDto {
    if (!payload) {
      throw new BadRequestException("payload field is required");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch (error) {
      throw new BadRequestException("payload must be valid JSON");
    }

    const dto = plainToInstance(CreateServerDto, parsed);
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    if (dto.blueprintId === "com.kubek.custom" && !coreFile) {
      throw new BadRequestException("coreFile is required for custom servers");
    }

    return this.servers.create(dto, user.id, coreFile);
  }

  /** Start a server */
  @Post(":id/start")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Start server" })
  @CheckServerAccess("id")
  @RequirePermissions(UserPermissions.SERVERS_CONTROL)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_CONTROL])
  @Audit({
    action: AuditAction.SERVER_START,
    category: AuditCategory.SERVER,
    resourceType: "server",
  })
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiAcceptedResponse({ description: "Start initiated" })
  @ApiErrorResponses([401, 403, 404])
  async start(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
  ): Promise<void> {
    return this.servers.start(id, user.id);
  }

  /** Stop a server */
  @Post(":id/stop")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Stop server" })
  @CheckServerAccess("id")
  @RequirePermissions(UserPermissions.SERVERS_CONTROL)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_CONTROL])
  @Audit({
    action: AuditAction.SERVER_STOP,
    category: AuditCategory.SERVER,
    resourceType: "server",
  })
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiAcceptedResponse({ description: "Stop initiated" })
  @ApiErrorResponses([401, 403, 404])
  async stop(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
  ): Promise<void> {
    return this.servers.stop(id, user);
  }

  /** Restart a server */
  @Post(":id/restart")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Restart server" })
  @CheckServerAccess("id")
  @RequirePermissions(UserPermissions.SERVERS_CONTROL)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_CONTROL])
  @Audit({
    action: AuditAction.SERVER_RESTART,
    category: AuditCategory.SERVER,
    resourceType: "server",
  })
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiAcceptedResponse({ description: "Restart initiated" })
  @ApiErrorResponses([401, 403, 404])
  async restart(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
  ): Promise<void> {
    return this.servers.restart(id, user);
  }

  /** Kill a server */
  @Post(":id/kill")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Force kill server" })
  @CheckServerAccess("id")
  @RequirePermissions(UserPermissions.SERVERS_CONTROL)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_CONTROL])
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiAcceptedResponse({ description: "Process end initiated" })
  @ApiErrorResponses([401, 403, 404])
  async kill(@Param("id") id: string): Promise<void> {
    return this.servers.kill(id);
  }

  /** Recent diagnostics (recognized errors / health issues) for a server */
  @Get(":id/diagnostics")
  @ApiOperation({ summary: "Get server diagnostics" })
  @CheckServerAccess("id")
  @RequirePermissions(UserPermissions.SERVERS_VIEW)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_VIEW])
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiOkResponse({
    type: [ServerDiagnosticDto],
    description: "Recent diagnostics",
  })
  @ApiErrorResponses([401, 403, 404])
  async getDiagnostics(
    @Param("id") id: string,
  ): Promise<ServerDiagnosticDto[]> {
    return this.servers.getDiagnostics(id);
  }

  /** Delete a server with password + name confirmation */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete server (requires password + name confirmation)",
  })
  @CheckServerAccess("id")
  @RequirePermissions(UserPermissions.SERVERS_CONFIGURE)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_CONFIGURE])
  @Audit({
    action: AuditAction.SERVER_DELETE,
    category: AuditCategory.SERVER,
    resourceType: "server",
    resolve: ({ req }) => ({ resourceName: req.body?.confirmName }),
    resolveError: ({ req }) => ({ resourceName: req.body?.confirmName }),
  })
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiNoContentResponse({ description: "Server deleted" })
  @ApiErrorResponses([400, 401, 403, 404])
  async remove(
    @Param("id") id: string,
    @Body() body: DeleteServerDto,
    @CurrentUser() user: IUser,
  ): Promise<void> {
    await this.servers.delete(id, user, body.password, body.confirmName);
  }

  /** Delete multiple servers with a single password confirmation */
  @Post("bulk-delete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Bulk delete servers (requires password)" })
  @RequirePermissions(UserPermissions.SERVERS_CONFIGURE)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_CONFIGURE])
  @ApiOkResponse({
    type: BulkDeleteResultDto,
    description: "Bulk delete summary",
  })
  @ApiErrorResponses([400, 401, 403])
  async bulkDelete(
    @Body() body: BulkDeleteServersDto,
    @CurrentUser() user: IUser,
  ): Promise<BulkDeleteResultDto> {
    return this.servers.bulkDelete(body.ids, user, body.password);
  }

  /** Duplicate a server (DB row + files) under a new name */
  @Post(":id/duplicate")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Duplicate server" })
  @CheckServerAccess("id")
  @RequirePermissions(UserPermissions.CREATE_SERVERS)
  @ApiExtension("x-permissions", [UserPermissions.CREATE_SERVERS])
  @ApiParam({ name: "id", description: "Source server ID" })
  @ApiAcceptedResponse({
    type: ServerCreatedResponseDto,
    description: "Duplication started",
  })
  @ApiErrorResponses([400, 401, 403, 404])
  duplicate(
    @Param("id") id: string,
    @Body() body: DuplicateServerDto,
    @CurrentUser() user: IUser,
  ): ServerCreatedResponseDto {
    return this.servers.duplicate(id, body.name, user.id);
  }

  /** Export server as a zip archive (manifest + files) */
  @Get(":id/export")
  @ApiOperation({ summary: "Export server as zip" })
  @CheckServerAccess("id")
  @RequirePermissions(UserPermissions.SERVERS_CONFIGURE)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_CONFIGURE])
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiResponse({ status: 200, description: "Zip archive stream" })
  @ApiErrorResponses([401, 403, 404])
  async exportServer(@Param("id") id: string, @Res() res): Promise<void> {
    const { archivePath, suggestedName, cleanup } =
      await this.servers.exportServer(id);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${suggestedName}"`,
    );

    res.sendFile(archivePath, (err: any) => {
      cleanup();
      if (err && !res.headersSent) {
        res.status(500).end();
      }
    });
  }

  /** Import a kubek-export zip archive as a new server */
  @Post("import")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Import server from zip" })
  @RequirePermissions(UserPermissions.CREATE_SERVERS)
  @ApiExtension("x-permissions", [UserPermissions.CREATE_SERVERS])
  @UseInterceptors(
    FileInterceptor("archive", {
      storage: memoryStorage(),
      limits: { fileSize: 1024 * 1024 * 1024 * 2 },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        archive: { type: "string", format: "binary" },
        name: { type: "string", description: "Optional override name" },
      },
      required: ["archive"],
    },
  })
  @ApiAcceptedResponse({
    type: ServerCreatedResponseDto,
    description: "Import started",
  })
  @ApiErrorResponses([400, 401, 403])
  async importServer(
    @UploadedFile() archive: Express.Multer.File,
    @Body("name") overrideName: string | undefined,
    @CurrentUser() user: IUser,
  ): Promise<ServerCreatedResponseDto> {
    return this.servers.importServer(archive, overrideName, user.id);
  }

  /** Get server.properties file */
  @Get(":id/properties")
  @ApiOperation({ summary: "Get server.properties" })
  @CheckServerAccess("id")
  @RequirePermissions(UserPermissions.SERVERS_CONFIGURE)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_CONFIGURE])
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiOkResponse({
    description: "Server properties (free-form key/value map)",
    schema: {
      type: "object",
      additionalProperties: { type: "string" },
      example: { "max-players": "20", motd: "A Minecraft Server" },
    },
  })
  @ApiErrorResponses([401, 403, 404])
  async getProperties(@Param("id") id: string): Promise<Record<string, any>> {
    return this.servers.getServerProperties(id);
  }

  /** Save server.properties file */
  @Put(":id/properties")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Save server.properties" })
  @CheckServerAccess("id")
  @RequirePermissions(UserPermissions.SERVERS_CONFIGURE)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_CONFIGURE])
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiNoContentResponse({ description: "Properties saved successfully" })
  @ApiErrorResponses([400, 401, 403, 404])
  async saveProperties(
    @Param("id") id: string,
    @Body() body: ServerPropertiesDto,
  ): Promise<void> {
    return this.servers.saveServerProperties(id, body.properties);
  }

  /** Upload server icon */
  @Post(":id/icon")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseInterceptors(FileInterceptor("icon"))
  @ApiOperation({ summary: "Upload server icon" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        icon: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @CheckServerAccess("id")
  @RequirePermissions(UserPermissions.SERVERS_CONFIGURE)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_CONFIGURE])
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiNoContentResponse({ description: "Icon uploaded successfully" })
  @ApiErrorResponses([400, 401, 403, 404])
  async uploadIcon(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<void> {
    return this.servers.uploadServerIcon(id, file);
  }

  /** Update server settings (name, java, startup args, restart settings, stop command) */
  @Patch(":id/settings")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update server settings" })
  @CheckServerAccess("id")
  @RequirePermissions(UserPermissions.SERVERS_CONFIGURE)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_CONFIGURE])
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiOkResponse({
    type: ServerEntity,
    description: "Settings updated successfully",
  })
  @ApiErrorResponses([400, 401, 403, 404])
  async updateSettings(
    @Param("id") id: string,
    @Body() body: UpdateServerSettingsDto,
  ): Promise<ServerEntity> {
    return this.servers.updateServerSettings(id, body);
  }

  /** Change a server's core (blueprint) and version */
  @Post(":id/core")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Change server core/version" })
  @CheckServerAccess("id")
  @RequirePermissions(UserPermissions.SERVERS_CONFIGURE)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_CONFIGURE])
  @Audit({
    action: AuditAction.SERVER_CHANGE_CORE,
    category: AuditCategory.SERVER,
    resourceType: "server",
    resolve: ({ req, result }) => {
      let payload: { blueprintId?: string; version?: string } = {};
      try {
        payload = JSON.parse(req.body?.payload ?? "{}");
      } catch {
        // ignore: audit details stay empty for a malformed payload
      }
      return {
        resourceId: result?.server?.id,
        resourceName: result?.server?.name,
        details: {
          blueprintId: payload.blueprintId,
          version: payload.version,
        },
      };
    },
  })
  @UseInterceptors(
    FileInterceptor("coreFile", {
      storage: memoryStorage(),
      limits: { fileSize: 1024 * 1024 * 512 },
    }),
  )
  @ApiConsumes("multipart/form-data")
  // The payload field is a JSON-stringified ChangeServerCoreDto
  @ApiExtraModels(ChangeServerCoreDto)
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        payload: {
          type: "string",
          description: "JSON string containing ChangeServerCoreDto payload",
          example: JSON.stringify({
            blueprintId: "com.kubek.purpur",
            version: "1.21.4",
          }),
        },
        coreFile: {
          type: "string",
          format: "binary",
          description:
            "Custom core JAR file (required for the com.kubek.custom blueprint)",
        },
      },
      required: ["payload"],
    },
  })
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiAcceptedResponse({
    type: ServerCreatedResponseDto,
    description: "Core change started",
  })
  @ApiErrorResponses([400, 401, 403, 404])
  changeCore(
    @Param("id") id: string,
    @Body("payload") payload: string,
    @UploadedFile() coreFile: Express.Multer.File,
    @CurrentUser() user: IUser,
  ): ServerCreatedResponseDto {
    if (!payload) {
      throw new BadRequestException("payload field is required");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch (error) {
      throw new BadRequestException("payload must be valid JSON");
    }

    const dto = plainToInstance(ChangeServerCoreDto, parsed);
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    if (dto.blueprintId === "com.kubek.custom" && !coreFile) {
      throw new BadRequestException("coreFile is required for custom cores");
    }

    return this.servers.changeCore(id, dto, user.id, coreFile);
  }

  /** Get server icon */
  @Get(":id/icon")
  @ApiOperation({ summary: "Get server icon" })
  @CheckServerAccess("id")
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiResponse({ status: 200, description: "Server icon" })
  @ApiErrorResponses([401, 403, 404])
  async getIcon(@Param("id") id: string, @Res() res): Promise<void> {
    const iconPath = join(process.cwd(), "servers", id, "server-icon.png");

    if (!existsSync(iconPath)) {
      throw new NotFoundException("Server icon not found");
    }

    res.sendFile(iconPath);
  }
}
