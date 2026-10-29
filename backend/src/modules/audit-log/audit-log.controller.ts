import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Put,
  Query,
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
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import {
  AuditAction,
  AuditCategory,
  type AuditRetention,
  type AuditRetentionState,
} from "@shared/types/audit.types";
import type { Request } from "express";
import { diffChanges } from "./audit-diff";
import { AuditLogService } from "./audit-log.service";
import { Audit, auditNote } from "./audit.decorator";
import {
  AuditRetentionDto,
  AuditRetentionPreviewDto,
  AuditRetentionStateDto,
} from "./dto/audit-retention.dto";
import { AuditRetentionService } from "./retention/audit-retention.service";
import { AuditLogPageDto } from "./dto/audit-log-page.dto";
import { QueryAuditLogsDto } from "./dto/query-audit-logs.dto";

@ApiTags("Audit Log")
@ApiBearerAuth()
@Controller("api/audit-logs")
@UseGuards(BearerAuthGuard, AccessGuard)
export class AuditLogController {
  constructor(
    private readonly auditLog: AuditLogService,
    private readonly users: UsersRepository,
    private readonly retention: AuditRetentionService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Query audit logs (filtered, paginated)" })
  @ApiOkResponse({
    type: AuditLogPageDto,
    description: "Paginated audit log entries",
  })
  @ApiErrorResponses()
  @RequireAccess(AccessArea.AUDIT, "read")
  query(@Query() q: QueryAuditLogsDto): AuditLogPageDto {
    const { items, total } = this.auditLog.query(q);
    // Avatars follow the account's current nickname, not the snapshot
    const skins = new Map(
      this.users.findAll().map((user) => [user.id, user.skinName ?? null]),
    );
    return {
      items: items.map((item) => ({
        ...item,
        skinName: item.userId ? (skins.get(item.userId) ?? null) : null,
      })),
      total,
      limit: q.limit ?? 50,
      offset: q.offset ?? 0,
    };
  }

  @Get("retention")
  @ApiOperation({ summary: "Rotation limits and the size of the log" })
  @ApiOkResponse({ type: AuditRetentionStateDto })
  @ApiErrorResponses()
  @RequireAccess(AccessArea.AUDIT, "read")
  getRetention(): AuditRetentionState {
    return this.retention.state();
  }

  // Shortening the log hides history, so it takes manage
  @Put("retention")
  @ApiOperation({ summary: "Change rotation limits, applied right away" })
  @ApiOkResponse({ type: AuditRetentionDto })
  @ApiErrorResponses()
  @RequireAccess(AccessArea.AUDIT, "manage")
  @Audit({
    action: AuditAction.AUDIT_RETENTION_UPDATE,
    category: AuditCategory.SETTINGS,
    resourceType: "audit_retention",
  })
  setRetention(
    @Body() dto: AuditRetentionDto,
    @Req() req: Request,
  ): AuditRetention {
    const before = this.retention.get();
    const after = { keepDays: dto.keepDays, maxEntries: dto.maxEntries };
    auditNote(req, { changes: diffChanges(before, after) });
    return this.retention.set(after);
  }

  @Post("retention/preview")
  @HttpCode(200)
  @ApiOperation({ summary: "How many entries draft limits would remove now" })
  @ApiOkResponse({ type: AuditRetentionPreviewDto })
  @ApiErrorResponses()
  @RequireAccess(AccessArea.AUDIT, "manage")
  previewRetention(@Body() dto: AuditRetentionDto): AuditRetentionPreviewDto {
    return { removed: this.retention.preview(dto) };
  }
}
