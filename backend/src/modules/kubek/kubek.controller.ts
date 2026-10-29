import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { IConfiguration } from "@/core/types/config";
import { extractClientIp } from "@/core/utils/request";
import { FtpPasswordService } from "@/modules/accounts/ftp-password.service";
import { Audit, auditNote } from "@/modules/audit-log/audit.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  HttpStatus,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AccessArea } from "@shared/access/areas";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";
import { can } from "@shared/access/can";
import type { Request } from "express";
import { configAudit } from "./config-audit";
import { ConfigurationDto, RevealedSecretDto } from "./dto/configuration.dto";
import { UpdateCheckResultDto } from "./dto/update-check.dto";
import { KubekService } from "./kubek.service";

@ApiTags("Kubek")
@ApiBearerAuth()
@Controller("api/kubek")
@UseGuards(BearerAuthGuard, AccessGuard)
export class KubekController {
  constructor(
    private readonly kubekService: KubekService,
    private readonly ftpPasswords: FtpPasswordService,
  ) {}

  /**
   * Get Kubek version
   * @returns Version string
   */
  @Get("version")
  @ApiOperation({ summary: "Get Kubek version" })
  @ApiOkResponse({ description: "Version string", type: String })
  @ApiErrorResponses()
  @RequireAccess(AccessArea.PANEL, "manage")
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
  @RequireAccess(AccessArea.PANEL, "manage")
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
  @RequireAccess(AccessArea.PANEL, "manage")
  getConfig(): ConfigurationDto {
    return this.kubekService.getConfigView();
  }

  /**
   * Reveal one secret config value, read on demand so it stays out of the config payload
   */
  @Get("config/secrets/:path")
  @ApiOperation({ summary: "Reveal a secret configuration value" })
  @ApiOkResponse({ description: "Secret value", type: RevealedSecretDto })
  @ApiErrorResponses()
  @RequireAccess(AccessArea.PANEL, "manage")
  @Audit({
    action: AuditAction.SETTINGS_SECRET_VIEW,
    category: AuditCategory.SETTINGS,
    resourceType: "config",
    resolve: ({ req }) => ({ details: { path: req.params.path } }),
  })
  revealSecret(@Param("path") path: string): RevealedSecretDto {
    return this.kubekService.revealSecret(path);
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
  @RequireAccess(AccessArea.PANEL, "manage")
  @Audit({
    action: AuditAction.SETTINGS_UPDATE,
    category: AuditCategory.SETTINGS,
    resourceType: "config",
  })
  updateConfig(
    @Body() config: Partial<IConfiguration>,
    @Req() req: Request,
    @CurrentUser() user: IUser,
  ): ConfigurationDto {
    const before = this.kubekService.snapshot();
    const view = this.kubekService.setConfig(config, {
      userId: user.id,
      username: user.username,
      ip: extractClientIp(req),
      userAgent: req.headers["user-agent"] ?? null,
    });
    auditNote(req, configAudit(before, this.kubekService.snapshot()));
    // Whoever turns FTP on gets a password
    if (config.ftpd?.enabled && can(user, AccessArea.FILES, "read")) {
      this.ftpPasswords.ensure(user.id);
    }
    return view;
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
