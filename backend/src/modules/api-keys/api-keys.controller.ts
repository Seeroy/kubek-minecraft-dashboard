import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { Audit, auditNote } from "@/modules/audit-log/audit.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { SessionOnly } from "@/modules/auth/decorators/session-only.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AccessArea } from "@shared/access/areas";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";
import type { Request } from "express";
import { keyChanges, keySummary } from "./api-keys.audit";
import { ApiKeysService } from "./api-keys.service";
import {
  ApiKeyDto,
  CreateApiKeyDto,
  CreatedApiKeyDto,
  UpdateApiKeyDto,
} from "./dto/api-key.dto";

@ApiTags("API keys")
@ApiBearerAuth()
@Controller("api/api-keys")
@UseGuards(BearerAuthGuard, AccessGuard)
@SessionOnly()
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Get()
  @ApiOperation({ summary: "API keys of the current user" })
  @RequireAccess(AccessArea.API, "write")
  @ApiOkResponse({ type: [ApiKeyDto] })
  @ApiErrorResponses([401, 403])
  list(@CurrentUser() user: IUser): ApiKeyDto[] {
    return this.apiKeys.listOwn(user.id);
  }

  @Get("all")
  @ApiOperation({ summary: "API keys of every user" })
  @RequireAccess(AccessArea.API, "manage")
  @ApiOkResponse({ type: [ApiKeyDto] })
  @ApiErrorResponses([401, 403])
  listAll(): ApiKeyDto[] {
    return this.apiKeys.listAll();
  }

  @Post()
  @ApiOperation({ summary: "Create an API key, the token is shown once" })
  @RequireAccess(AccessArea.API, "write")
  @ApiCreatedResponse({ type: CreatedApiKeyDto })
  @ApiErrorResponses([400, 401, 403])
  @Audit({
    action: AuditAction.API_KEY_CREATE,
    category: AuditCategory.AUTH,
    resourceType: "api_key",
    resolve: ({ result }) => ({
      resourceId: result.key.id,
      resourceName: result.key.name,
      details: keySummary((result as CreatedApiKeyDto).key),
    }),
    resolveError: ({ req }) => ({
      resourceName: (req.body as { name?: string } | undefined)?.name,
    }),
  })
  create(
    @CurrentUser() user: IUser,
    @Body() dto: CreateApiKeyDto,
  ): CreatedApiKeyDto {
    return this.apiKeys.create(user, {
      name: dto.name,
      grants: dto.grants,
      servers: dto.servers ?? null,
      mcp: dto.mcp ?? false,
      expiresAt: dto.expiresAt ?? null,
    });
  }

  @Patch(":id")
  @ApiOperation({ summary: "Change name, levels, servers or MCP of own key" })
  @RequireAccess(AccessArea.API, "write")
  @ApiOkResponse({ type: ApiKeyDto })
  @ApiErrorResponses([400, 401, 403, 404])
  @Audit({
    action: AuditAction.API_KEY_UPDATE,
    category: AuditCategory.AUTH,
    resourceType: "api_key",
    resolve: ({ result }) => ({ resourceName: result.name }),
  })
  update(
    @CurrentUser() user: IUser,
    @Param("id") id: string,
    @Body() dto: UpdateApiKeyDto,
    @Req() req: Request,
  ): ApiKeyDto {
    const before = this.apiKeys.find(id);
    const after = this.apiKeys.update(user, id, {
      name: dto.name,
      grants: dto.grants,
      servers: dto.servers,
      mcp: dto.mcp,
    });
    if (before) auditNote(req, { changes: keyChanges(before, after) });
    return after;
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Revoke own key, or any key with manage" })
  @RequireAccess(AccessArea.API, "write")
  @ApiNoContentResponse({ description: "Key revoked" })
  @ApiErrorResponses([401, 403, 404])
  @Audit({
    action: AuditAction.API_KEY_DELETE,
    category: AuditCategory.AUTH,
    resourceType: "api_key",
  })
  delete(
    @CurrentUser() user: IUser,
    @Param("id") id: string,
    @Req() req: Request,
  ): void {
    const key = this.apiKeys.delete(user, id);
    auditNote(req, {
      resourceName: key.name,
      details: key.userId === user.id ? undefined : { ownerId: key.userId },
    });
  }
}
