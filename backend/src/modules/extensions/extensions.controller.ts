import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { Audit } from "@/modules/audit-log/audit.decorator";
import { RequirePermissions } from "@/modules/auth/decorators/require-permissions.decorator";
import { AdminGuard } from "@/modules/auth/guards/admin.guard";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permission.guard";
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
  ApiProduces,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import { UserPermissions } from "@shared/types/user.types";
import type { Request, Response } from "express";
import {
  ExtensionRegistryEntryDto,
  ExtensionSummaryDto,
} from "./dto/extension-responses.dto";
import { ExtensionManager } from "./extension-manager.service";

@ApiTags("Extensions")
@ApiBearerAuth()
@Controller("api/extensions")
@UseGuards(BearerAuthGuard, PermissionsGuard)
export class ExtensionsController {
  constructor(private readonly manager: ExtensionManager) {}

  @Get()
  @ApiOperation({ summary: "List installed extensions" })
  @RequirePermissions(UserPermissions.KUBEK_SETTINGS)
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
  @RequirePermissions(UserPermissions.KUBEK_SETTINGS)
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
  @RequirePermissions(UserPermissions.KUBEK_SETTINGS)
  @ApiNoContentResponse({ description: "Capabilities granted" })
  @ApiErrorResponses()
  consent(
    @Param("id") id: string,
    @Body("capabilities") capabilities: Capability[],
  ): void {
    this.manager.consent(id, capabilities ?? []);
  }

  @Post(":id/enable")
  @HttpCode(200)
  @ApiOperation({ summary: "Enable and activate an extension" })
  @RequirePermissions(UserPermissions.KUBEK_SETTINGS)
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
  @RequirePermissions(UserPermissions.KUBEK_SETTINGS)
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
  @RequirePermissions(UserPermissions.KUBEK_SETTINGS)
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
