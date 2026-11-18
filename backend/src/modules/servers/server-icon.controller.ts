import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { AccessArea } from "@shared/access/areas";
import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { UPLOAD_LIMITS } from "@/core/utils/uploads";
import { Audit } from "@/modules/audit-log/audit.decorator";
import { CheckServerAccess } from "@/modules/auth/decorators/check-server-access.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { ServerAccessGuard } from "@/modules/auth/guards/server-access.guard";
import { ServerIconService } from "@/modules/servers/server-icon.service";
import { serverAudit } from "@/modules/servers/servers.audit";
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction } from "@shared/types/audit.types";

// operationIds keep the ServersController names the generated client uses
@ApiTags("Servers")
@ApiBearerAuth()
@Controller("api/servers")
@UseGuards(BearerAuthGuard, AccessGuard, ServerAccessGuard)
export class ServerIconController {
  constructor(private readonly icons: ServerIconService) {}

  /** Upload server icon */
  @Post(":id/icon")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseInterceptors(
    FileInterceptor("icon", { limits: { fileSize: UPLOAD_LIMITS.icon } }),
  )
  @ApiOperation({
    summary: "Upload server icon",
    operationId: "ServersController_uploadIcon",
  })
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
  @RequireAccess(AccessArea.SETTINGS, "write")
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiNoContentResponse({ description: "Icon uploaded successfully" })
  @ApiErrorResponses([400, 401, 403, 404, 413])
  @Audit(serverAudit(AuditAction.SERVER_ICON_UPDATE))
  async uploadIcon(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<void> {
    return this.icons.upload(id, file);
  }

  /** Get server icon */
  @Get(":id/icon")
  @ApiOperation({
    summary: "Get server icon",
    operationId: "ServersController_getIcon",
  })
  @CheckServerAccess("id")
  @ApiParam({ name: "id", description: "Server ID" })
  @ApiResponse({ status: 200, description: "Server icon set by the owner" })
  @ApiErrorResponses([401, 403, 404])
  async getIcon(@Param("id") id: string, @Res() res): Promise<void> {
    // The UI shows the core icon instead of Kubek's default one
    const iconPath = this.icons.customIconPath(id);
    if (!iconPath) {
      throw new NotFoundException("Server icon not found");
    }

    // The file can change by hand, the ETag check keeps refetches cheap
    res.sendFile(iconPath, { headers: { "Cache-Control": "no-cache" } });
  }
}
