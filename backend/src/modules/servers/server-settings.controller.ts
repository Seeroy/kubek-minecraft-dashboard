import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { AccessArea } from "@shared/access/areas";
import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { MultipartPayload } from "@/core/middlewares/json-payload.pipe";
import { Audit, auditNote } from "@/modules/audit-log/audit.decorator";
import { diffChanges } from "@/modules/audit-log/audit-diff";
import { CheckServerAccess } from "@/modules/auth/decorators/check-server-access.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { ServerAccessGuard } from "@/modules/auth/guards/server-access.guard";
import { JavaService } from "@/modules/java/java.service";
import { ChangeServerCoreDto } from "@/modules/servers/dto/change-server-core.dto";
import { ServerCreatedResponseDto } from "@/modules/servers/dto/server-created-response.dto";
import { ServerPropertiesDto } from "@/modules/servers/dto/server-properties.dto";
import { ServerEntity } from "@/modules/servers/dto/server.entity";
import { UpdateServerSettingsDto } from "@/modules/servers/dto/update-server-settings.dto";
import { ServersService } from "@/modules/servers/servers.service";
import { serverAudit, settingsChanges } from "@/modules/servers/servers.audit";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
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

// operationIds keep the ServersController names the generated client uses
@ApiTags("Servers")
@ApiBearerAuth()
@Controller("api/servers")
@UseGuards(BearerAuthGuard, AccessGuard, ServerAccessGuard)
export class ServerSettingsController {
  constructor(
    private readonly servers: ServersService,
    private readonly javaService: JavaService,
  ) {}

  /** Get server.properties file */
  @Get(":id/properties")
  @ApiOperation({
    summary: "Get server.properties",
    operationId: "ServersController_getProperties",
  })
  @CheckServerAccess("id")
  @RequireAccess(AccessArea.SETTINGS, "read")
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
  async getProperties(
    @Param("id") id: string,
  ): Promise<Record<string, string>> {
    return this.servers.getServerProperties(id);
  }

  /** Save server.properties file */
  @Put(":id/properties")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Save server.properties",
    operationId: "ServersController_saveProperties",
  })
  @CheckServerAccess("id")
  @RequireAccess(AccessArea.SETTINGS, "write")
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiNoContentResponse({ description: "Properties saved successfully" })
  @ApiErrorResponses([400, 401, 403, 404])
  @Audit(
    serverAudit(AuditAction.SERVER_PROPERTIES_UPDATE, {
      resourceType: "properties",
      resolve: () => ({ resourceName: "server.properties" }),
    }),
  )
  async saveProperties(
    @Param("id") id: string,
    @Body() body: ServerPropertiesDto,
    @Req() req: Request,
  ): Promise<void> {
    // A server that never ran has no file yet, every key is then new
    const before = await this.servers.getServerProperties(id).catch(() => ({}));
    await this.servers.saveServerProperties(id, body.properties);
    const after = await this.servers.getServerProperties(id);
    auditNote(req, { changes: diffChanges(before, after) });
  }

  /** Update server settings (name, java, startup args, restart settings, stop command) */
  @Patch(":id/settings")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update server settings",
    operationId: "ServersController_updateSettings",
  })
  @CheckServerAccess("id")
  @RequireAccess(AccessArea.SETTINGS, "write")
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiOkResponse({
    type: ServerEntity,
    description: "Settings updated successfully",
  })
  @ApiErrorResponses([400, 401, 403, 404])
  @Audit(serverAudit(AuditAction.SERVER_SETTINGS_UPDATE))
  async updateSettings(
    @Param("id") id: string,
    @Body() body: UpdateServerSettingsDto,
    @CurrentUser() user: IUser,
    @Req() req: Request,
  ): Promise<ServerEntity> {
    const before = this.servers.findById(id);
    await this.javaService.assertJavaPathAllowed(
      body.variables?.JAVA_PATH,
      user,
      before?.variables?.JAVA_PATH,
    );
    const updated = await this.servers.updateServerSettings(id, body);
    if (before) {
      const labels = this.servers.variableLabels(updated);
      auditNote(req, { changes: settingsChanges(before, updated, labels) });
    }
    return updated;
  }

  /** Change a server's core (blueprint) and version */
  @Post(":id/core")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: "Change server core/version",
    operationId: "ServersController_changeCore",
  })
  @CheckServerAccess("id")
  @RequireAccess(AccessArea.SETTINGS, "manage")
  @Audit(serverAudit(AuditAction.SERVER_CHANGE_CORE))
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
    @MultipartPayload(ChangeServerCoreDto) dto: ChangeServerCoreDto,
    @UploadedFile() coreFile: Express.Multer.File,
    @CurrentUser() user: IUser,
    @Req() req: Request,
  ): ServerCreatedResponseDto {
    if (dto.blueprintId === "com.kubek.custom" && !coreFile) {
      throw new BadRequestException("coreFile is required for custom cores");
    }

    const before = this.servers.findById(id);
    auditNote(req, {
      changes: diffChanges(
        {
          blueprintId: before?.blueprintId,
          version: before?.variables?.GAME_VERSION,
        },
        { blueprintId: dto.blueprintId, version: dto.version },
      ),
    });
    return this.servers.changeCore(id, dto, user.id, coreFile);
  }
}
