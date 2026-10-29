import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { Audit } from "@/modules/audit-log/audit.decorator";
import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { AdminGuard } from "@/modules/auth/guards/admin.guard";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import type { Capability } from "@kubekpanel/extension-sdk";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from "@nestjs/swagger";
import { AccessArea } from "@shared/access/areas";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type { Request, Response } from "express";
import {
  ExtensionRegistryEntryDto,
  ExtensionSummaryDto,
} from "./dto/extension-responses.dto";
import { ExtensionManager } from "./extension-manager.service";

@ApiTags("Extensions")
@ApiBearerAuth()
@Controller("api/extensions")
@UseGuards(BearerAuthGuard, AccessGuard)
export class ExtensionsController {
  constructor(private readonly manager: ExtensionManager) {}

  @Get()
  @ApiOperation({ summary: "List installed extensions" })
  @RequireAccess(AccessArea.INTEGRATIONS, "manage")
  @ApiOkResponse({
    type: [ExtensionSummaryDto],
    description: "Installed extensions",
  })
  @ApiErrorResponses()
  list(): ExtensionSummaryDto[] {
    return this.manager.list();
  }

  @Get("registry")
  @ApiOperation({
    summary: "Active extensions with frontend contributions (panel runtime)",
  })
  @ApiOkResponse({
    type: [ExtensionRegistryEntryDto],
    description: "Active frontend-contributing extensions",
  })
  @ApiErrorResponses()
  registry(): ExtensionRegistryEntryDto[] {
    return this.manager.frontendRegistry();
  }

  @Get(":id/assets/*path")
  @ApiOperation({ summary: "Serve a static asset bundled with an extension" })
  // Wildcard route, OpenAPI can only show it as one param
  @ApiParam({
    name: "path",
    type: String,
    description: "Asset path inside the extension, may contain slashes",
  })
  @ApiProduces("application/octet-stream")
  @ApiOkResponse({ description: "Static asset file stream" })
  @ApiErrorResponses()
  asset(
    @Param("id") id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    const rel = req.path.split(`/api/extensions/${id}/assets/`)[1] ?? "";
    const file = this.manager.resolveAsset(id, decodeURIComponent(rel));
    if (!file) throw new NotFoundException("Asset not found");
    res.sendFile(file);
  }

  @Post()
  @ApiOperation({ summary: "Install an extension from an uploaded package" })
  @ApiConsumes("multipart/form-data")
  // Installing runs the extension code in-process - restrict to admins
  @RequireAccess(AccessArea.INTEGRATIONS, "manage")
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  @Audit({
    action: AuditAction.EXTENSION_INSTALL,
    category: AuditCategory.SETTINGS,
    resourceType: "extension",
  })
  @HttpCode(201)
  @ApiCreatedResponse({
    type: ExtensionSummaryDto,
    description: "Installed extension record",
  })
  @ApiErrorResponses()
  async install(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ExtensionSummaryDto> {
    if (!file) throw new BadRequestException("Provide a package file");
    return this.manager.installFromFile(file);
  }

  @Post(":id/consent")
  @HttpCode(204)
  @ApiOperation({ summary: "Grant the capabilities an extension requested" })
  @RequireAccess(AccessArea.INTEGRATIONS, "manage")
  @ApiNoContentResponse({ description: "Capabilities granted" })
  @ApiErrorResponses()
  @Audit({
    action: AuditAction.EXTENSION_CONSENT,
    category: AuditCategory.SETTINGS,
    resourceType: "extension",
    resolve: ({ req }) => ({
      details: { capabilities: req.body?.capabilities ?? [] },
    }),
  })
  consent(
    @Param("id") id: string,
    @Body("capabilities") capabilities: Capability[],
  ): void {
    this.manager.consent(id, capabilities ?? []);
  }

  @Post(":id/enable")
  @HttpCode(200)
  @ApiOperation({ summary: "Enable and activate an extension" })
  @RequireAccess(AccessArea.INTEGRATIONS, "manage")
  @Audit({
    action: AuditAction.EXTENSION_ENABLE,
    category: AuditCategory.SETTINGS,
    resourceType: "extension",
  })
  @ApiOkResponse({
    type: ExtensionSummaryDto,
    description: "Updated extension record",
  })
  @ApiErrorResponses()
  enable(@Param("id") id: string): Promise<ExtensionSummaryDto> {
    return this.manager.enable(id);
  }

  @Post(":id/disable")
  @HttpCode(200)
  @ApiOperation({ summary: "Disable an extension" })
  @RequireAccess(AccessArea.INTEGRATIONS, "manage")
  @Audit({
    action: AuditAction.EXTENSION_DISABLE,
    category: AuditCategory.SETTINGS,
    resourceType: "extension",
  })
  @ApiOkResponse({
    type: ExtensionSummaryDto,
    description: "Updated extension record",
  })
  @ApiErrorResponses()
  disable(@Param("id") id: string): Promise<ExtensionSummaryDto> {
    return this.manager.disable(id);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Uninstall an extension" })
  @RequireAccess(AccessArea.INTEGRATIONS, "manage")
  @Audit({
    action: AuditAction.EXTENSION_DELETE,
    category: AuditCategory.SETTINGS,
    resourceType: "extension",
  })
  @ApiNoContentResponse({ description: "Extension uninstalled" })
  @ApiErrorResponses()
  async remove(@Param("id") id: string): Promise<void> {
    await this.manager.remove(id);
  }
}
