import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { AccessArea } from "@shared/access/areas";
import { TaskRefResponseDto } from "@/core/dto/task-ref-response.dto";
import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { Audit } from "@/modules/audit-log/audit.decorator";
import { CheckServerAccess } from "@/modules/auth/decorators/check-server-access.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { ServerAccessGuard } from "@/modules/auth/guards/server-access.guard";
import { DuplicateServerDto } from "@/modules/servers/dto/duplicate-server.dto";
import { ServerCreatedResponseDto } from "@/modules/servers/dto/server-created-response.dto";
import { ServerTransfer } from "@/modules/servers/server-transfer";
import type { ExportArtifact } from "@/modules/servers/servers.types";
import { serverAudit } from "@/modules/servers/servers.audit";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction } from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";
import { memoryStorage } from "multer";

// operationIds keep the ServersController names the generated client uses
@ApiTags("Servers")
@ApiBearerAuth()
@Controller("api/servers")
@UseGuards(BearerAuthGuard, AccessGuard, ServerAccessGuard)
export class ServerTransferController {
  constructor(private readonly transfer: ServerTransfer) {}

  /** Duplicate a server (DB row + files) under a new name */
  @Post(":id/duplicate")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: "Duplicate server",
    operationId: "ServersController_duplicate",
  })
  @CheckServerAccess("id")
  @RequireAccess(AccessArea.SERVERS, "write")
  @ApiParam({ name: "id", description: "Source server ID" })
  @ApiAcceptedResponse({
    type: ServerCreatedResponseDto,
    description: "Duplication started",
  })
  @ApiErrorResponses([400, 401, 403, 404])
  @Audit(
    serverAudit(AuditAction.SERVER_DUPLICATE, {
      resolve: ({ req, result }) => ({
        resourceId: result?.server?.id,
        resourceName: req.body?.name,
      }),
      resolveError: ({ req }) => ({ resourceName: req.body?.name }),
    }),
  )
  duplicate(
    @Param("id") id: string,
    @Body() body: DuplicateServerDto,
    @CurrentUser() user: IUser,
  ): ServerCreatedResponseDto {
    return this.transfer.duplicateServer(id, body.name, user.id || "");
  }

  /** Export server as a zip archive (manifest + files) */
  @Get(":id/export")
  @ApiOperation({
    summary: "Export server as zip",
    operationId: "ServersController_exportServer",
  })
  @CheckServerAccess("id")
  @RequireAccess(AccessArea.SETTINGS, "manage")
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiResponse({ status: 200, description: "Zip archive stream" })
  @ApiErrorResponses([401, 403, 404])
  async exportServer(@Param("id") id: string, @Res() res): Promise<void> {
    this.sendExport(res, await this.transfer.exportServer(id));
  }

  /** Pack the server in a background task, progress arrives as task updates */
  @Post(":id/export")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: "Start a server export task",
    operationId: "ServersController_startExport",
  })
  @CheckServerAccess("id")
  @RequireAccess(AccessArea.SETTINGS, "manage")
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiAcceptedResponse({ type: TaskRefResponseDto })
  @ApiErrorResponses([401, 403, 404])
  startExport(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
  ): TaskRefResponseDto {
    return this.transfer.startExport(id, user.id || "");
  }

  /** Archive built by an export task, downloadable once by whoever started it */
  @Get("exports/:taskId")
  @ApiOperation({
    summary: "Download a finished server export",
    operationId: "ServersController_downloadExport",
  })
  @RequireAccess(AccessArea.SETTINGS, "manage")
  @ApiParam({ name: "taskId", description: "Export task ID" })
  @ApiResponse({ status: 200, description: "Zip archive stream" })
  @ApiErrorResponses([401, 403, 404])
  downloadExport(
    @Param("taskId") taskId: string,
    @CurrentUser() user: IUser,
    @Res() res,
  ): void {
    this.sendExport(res, this.transfer.takeExport(taskId, user.id || ""));
  }

  private sendExport(
    res,
    { archivePath, suggestedName, cleanup }: ExportArtifact,
  ): void {
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
  @ApiOperation({
    summary: "Import server from zip",
    operationId: "ServersController_importServer",
  })
  @RequireAccess(AccessArea.SERVERS, "write")
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
  @Audit(
    serverAudit(AuditAction.SERVER_IMPORT, {
      resolve: ({ result }) => ({
        resourceId: result?.server?.id,
        resourceName: result?.server?.name,
        serverId: result?.server?.id,
        serverName: result?.server?.name,
      }),
    }),
  )
  async importServer(
    @UploadedFile() archive: Express.Multer.File,
    @Body("name") overrideName: string | undefined,
    @CurrentUser() user: IUser,
  ): Promise<ServerCreatedResponseDto> {
    return this.transfer.importServer(archive, overrideName, user.id || "");
  }
}
