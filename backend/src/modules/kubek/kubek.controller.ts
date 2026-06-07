import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { IConfiguration } from "@/core/types/config";
import { Audit } from "@/modules/audit-log/audit.decorator";
import { RequirePermissions } from "@/modules/auth/decorators/require-permissions.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permission.guard";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiExtension,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import { UserPermissions } from "@shared/types/user.types";
import type { Request } from "express";
import { ConfigurationDto } from "./dto/configuration.dto";
import { UpdateCheckResultDto } from "./dto/update-check.dto";
import { KubekService } from "./kubek.service";

@ApiTags("Kubek")
@ApiBearerAuth()
@Controller("api/kubek")
@UseGuards(BearerAuthGuard, PermissionsGuard)
export class KubekController {
  constructor(private readonly kubekService: KubekService) {}

  /**
   * Get Kubek version
   * @returns Version string
   */
  @Get("version")
  @ApiOperation({ summary: "Get Kubek version" })
  @ApiOkResponse({ description: "Version string", type: String })
  @ApiErrorResponses()
  @ApiExtension("x-permissions", [UserPermissions.KUBEK_SETTINGS])
  @RequirePermissions(UserPermissions.KUBEK_SETTINGS)
  getVersion(): string {
    return this.kubekService.getVersion();
  }

  /**
   * Check GitHub for a newer panel release
   * @returns Update availability and latest release info
   */
  @Get("updates")
  @ApiOperation({ summary: "Check for panel updates" })
  @ApiOkResponse({
    description: "Update check result",
    type: UpdateCheckResultDto,
  })
  @ApiErrorResponses()
  @ApiExtension("x-permissions", [UserPermissions.KUBEK_SETTINGS])
  @RequirePermissions(UserPermissions.KUBEK_SETTINGS)
  checkForUpdates(): Promise<UpdateCheckResultDto> {
    return this.kubekService.checkForUpdates();
  }

  /**
   * Get all configuration
   * @returns Configuration data
   */
  @Get("config")
  @ApiOperation({ summary: "Get all configuration" })
  @ApiOkResponse({ description: "Configuration data", type: ConfigurationDto })
  @ApiErrorResponses()
  @ApiExtension("x-permissions", [UserPermissions.KUBEK_SETTINGS])
  @RequirePermissions(UserPermissions.KUBEK_SETTINGS)
  getConfig(): ConfigurationDto {
    return this.kubekService.getAllConfig();
  }

  /**
   * Update configuration
   * @param config - Configuration data
   * @returns Success status
   */
  @Put("config")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update configuration" })
  @ApiOkResponse({
    description: "Configuration updated",
    type: ConfigurationDto,
  })
  @ApiErrorResponses()
  @ApiExtension("x-permissions", [UserPermissions.KUBEK_SETTINGS])
  @RequirePermissions(UserPermissions.KUBEK_SETTINGS)
  @Audit({
    action: AuditAction.SETTINGS_UPDATE,
    category: AuditCategory.SETTINGS,
    resourceType: "config",
    // Toggling the embedded FTP service is recorded as its own action
    resolve: ({ req }) => {
      const body = (req.body ?? {}) as Partial<IConfiguration>;
      const keys = Object.keys(body);
      const nextFtp = body.ftpd?.enabled;
      const prevFtp = (req as Request & { auditFtpBefore?: boolean })
        .auditFtpBefore;
      if (typeof nextFtp === "boolean" && nextFtp !== prevFtp) {
        return {
          action: nextFtp ? AuditAction.FTP_ENABLE : AuditAction.FTP_DISABLE,
          resourceType: "ftp",
          details: { keys },
        };
      }
      return { details: { keys } };
    },
  })
  updateConfig(
    @Body() config: Partial<IConfiguration>,
    @Req() req: Request & { auditFtpBefore?: boolean },
  ): ConfigurationDto {
    req.auditFtpBefore =
      this.kubekService.getAllConfig().ftpd?.enabled ?? false;
    return this.kubekService.setConfig(config);
  }

  /**
   * Accept EULA agreement
   * @returns Success status
   */
  @Get("acceptEULA")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Accept EULA agreement" })
  @ApiOkResponse({ description: "EULA accepted" })
  @ApiErrorResponses()
  acceptEULA(): void {
    return this.kubekService.acceptEULA();
  }
}
