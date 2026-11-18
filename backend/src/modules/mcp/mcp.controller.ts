import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { diffChanges } from "@/modules/audit-log/audit-diff";
import { Audit, auditNote } from "@/modules/audit-log/audit.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { SessionOnly } from "@/modules/auth/decorators/session-only.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import {
  All,
  Body,
  Controller,
  Get,
  Put,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from "@nestjs/swagger";
import { AccessArea } from "@shared/access/areas";
import type { McpSettings } from "@shared/types/api-key.types";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";
import { IsBoolean } from "class-validator";
import type { Request, Response } from "express";
import { McpService } from "./mcp.service";

export class McpSettingsDto implements McpSettings {
  @ApiProperty({ description: "MCP endpoint is open for keys that allow it" })
  @IsBoolean()
  enabled: boolean;
}

@ApiTags("MCP")
@ApiBearerAuth()
@Controller("api/mcp")
@UseGuards(BearerAuthGuard, AccessGuard)
export class McpController {
  constructor(private readonly mcp: McpService) {}

  @Get("settings")
  @ApiOperation({ summary: "Whether MCP is turned on for the panel" })
  @RequireAccess(AccessArea.API, "write")
  @ApiOkResponse({ type: McpSettingsDto })
  @ApiErrorResponses([401, 403])
  settings(): McpSettingsDto {
    return { enabled: this.mcp.isEnabled() };
  }

  @Put("settings")
  @SessionOnly()
  @ApiOperation({ summary: "Turn MCP on or off for the panel" })
  @RequireAccess(AccessArea.PANEL, "manage")
  @ApiOkResponse({ type: McpSettingsDto })
  @ApiErrorResponses([400, 401, 403])
  @Audit({
    action: AuditAction.MCP_TOGGLE,
    category: AuditCategory.SETTINGS,
    resourceType: "mcp",
  })
  updateSettings(
    @Body() dto: McpSettingsDto,
    @Req() req: Request,
  ): McpSettingsDto {
    const before = this.mcp.isEnabled();
    this.mcp.setEnabled(dto.enabled);
    auditNote(req, {
      changes: diffChanges({ enabled: before }, { enabled: dto.enabled }),
    });
    return { enabled: dto.enabled };
  }

  /** Streamable HTTP endpoint */
  @All()
  @ApiExcludeEndpoint()
  handle(
    @CurrentUser() user: IUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    return this.mcp.handle(user, req, res);
  }
}
