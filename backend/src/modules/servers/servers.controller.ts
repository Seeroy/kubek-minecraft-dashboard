import {
  RequireAccess,
  RequireServerView,
} from "@/modules/auth/decorators/require-access.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { AccessArea } from "@shared/access/areas";
import { visibleServers } from "@/core/utils/serverAccess";
import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { MultipartPayload } from "@/core/middlewares/json-payload.pipe";
import { Audit, auditNote } from "@/modules/audit-log/audit.decorator";
import { CheckServerAccess } from "@/modules/auth/decorators/check-server-access.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { ServerAccessGuard } from "@/modules/auth/guards/server-access.guard";
import { BulkDeleteResultDto } from "@/modules/servers/dto/bulk-delete-result.dto";
import { BulkDeleteServersDto } from "@/modules/servers/dto/bulk-delete-servers.dto";
import { CreateServerDto } from "@/modules/servers/dto/create-server.dto";
import { DeleteServerDto } from "@/modules/servers/dto/delete-server.dto";
import { ServerDiagnosticDto } from "@/modules/servers/dto/server-diagnostic.dto";
import { ServerCreatedResponseDto } from "@/modules/servers/dto/server-created-response.dto";
import { ServerEntity } from "@/modules/servers/dto/server.entity";
import { JavaService } from "@/modules/java/java.service";
import { ServerDeletionService } from "@/modules/servers/server-deletion.service";
import { ServersService } from "@/modules/servers/servers.service";
import { payloadOf, serverAudit } from "@/modules/servers/servers.audit";
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
  Post,
  Req,
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
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction } from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";
import type { Request } from "express";
import { memoryStorage } from "multer";

@ApiTags("Servers")
@ApiBearerAuth()
@Controller("api/servers")
@UseGuards(BearerAuthGuard, AccessGuard, ServerAccessGuard)
export class ServersController {
  constructor(
    private readonly servers: ServersService,
    private readonly deletion: ServerDeletionService,
    private readonly javaService: JavaService,
  ) {}

  /** List all servers */
  @Get()
  @ApiOperation({ summary: "List servers" })
  @ApiOkResponse({ type: [ServerEntity], description: "List of servers" })
  @ApiErrorResponses([401, 403])
  @RequireServerView()
  getAll(@CurrentUser() user: IUser): ServerEntity[] {
    return visibleServers(user, this.servers.findAll());
  }

  /** Get server by ID */
  @Get(":id")
  @ApiOperation({ summary: "Get server" })
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiOkResponse({ type: ServerEntity, description: "Server entity" })
  @ApiErrorResponses([401, 403, 404])
  @CheckServerAccess("id")
  @RequireServerView()
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
  @RequireAccess(AccessArea.SERVERS, "write")
  @Audit(
    serverAudit(AuditAction.SERVER_CREATE, {
      resolve: ({ req, result }) => ({
        resourceId: result?.server?.id,
        resourceName: result?.server?.name,
        serverId: result?.server?.id,
        serverName: result?.server?.name,
        details: {
          blueprintId: payloadOf(req).blueprintId,
          version: payloadOf(req).variables?.GAME_VERSION,
        },
      }),
      resolveError: ({ req }) => ({ resourceName: payloadOf(req).name }),
    }),
  )
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
  async create(
    @MultipartPayload(CreateServerDto) dto: CreateServerDto,
    @UploadedFile() coreFile: Express.Multer.File,
    @CurrentUser() user: IUser,
  ): Promise<ServerCreatedResponseDto> {
    if (dto.blueprintId === "com.kubek.custom" && !coreFile) {
      throw new BadRequestException("coreFile is required for custom servers");
    }

    await this.javaService.assertJavaPathAllowed(
      dto.variables?.JAVA_PATH,
      user,
    );

    return this.servers.create(dto, user.id, coreFile);
  }

  /** Start a server */
  @Post(":id/start")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Start server" })
  @CheckServerAccess("id")
  @RequireAccess(AccessArea.POWER, "write")
  @Audit(serverAudit(AuditAction.SERVER_START))
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
  @RequireAccess(AccessArea.POWER, "write")
  @Audit(serverAudit(AuditAction.SERVER_STOP))
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
  @RequireAccess(AccessArea.POWER, "write")
  @Audit(serverAudit(AuditAction.SERVER_RESTART))
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
  @RequireAccess(AccessArea.POWER, "manage")
  @ApiParam({ name: "id", description: "Server ID" })
  @Audit(serverAudit(AuditAction.SERVER_KILL))
  @ApiAcceptedResponse({ description: "Process end initiated" })
  @ApiErrorResponses([401, 403, 404])
  async kill(@Param("id") id: string): Promise<void> {
    return this.servers.kill(id);
  }

  /** Recent diagnostics (recognized errors / health issues) for a server */
  @Get(":id/diagnostics")
  @ApiOperation({ summary: "Get server diagnostics" })
  @CheckServerAccess("id")
  @RequireServerView()
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
  @RequireAccess(AccessArea.SETTINGS, "manage")
  @Audit(serverAudit(AuditAction.SERVER_DELETE))
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiNoContentResponse({ description: "Server deleted" })
  @ApiErrorResponses([400, 401, 403, 404])
  async remove(
    @Param("id") id: string,
    @Body() body: DeleteServerDto,
    @CurrentUser() user: IUser,
  ): Promise<void> {
    await this.deletion.delete(id, user, body.password, body.confirmName);
  }

  /** Delete multiple servers with a single password confirmation */
  @Post("bulk-delete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Bulk delete servers (requires password)" })
  @RequireAccess(AccessArea.SETTINGS, "manage")
  @ApiOkResponse({
    type: BulkDeleteResultDto,
    description: "Bulk delete summary",
  })
  @ApiErrorResponses([400, 401, 403])
  @Audit(serverAudit(AuditAction.SERVER_BULK_DELETE))
  async bulkDelete(
    @Body() body: BulkDeleteServersDto,
    @CurrentUser() user: IUser,
    @Req() req: Request,
  ): Promise<BulkDeleteResultDto> {
    // Names are read first, deleted servers are gone afterwards
    const names = new Map(
      body.ids.map((id) => [id, this.servers.findById(id)?.name ?? id]),
    );
    auditNote(req, { details: { servers: [...names.values()] } });
    const result = await this.deletion.bulkDelete(
      body.ids,
      user,
      body.password,
    );
    auditNote(req, {
      details: {
        servers: undefined,
        deleted: result.deleted.map((id) => names.get(id) ?? id),
        failed: result.failed.map(
          (f) => `${names.get(f.id) ?? f.id}: ${f.reason}`,
        ),
      },
    });
    return result;
  }
}
