import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { RequirePermissions } from "@/modules/auth/decorators/require-permissions.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permission.guard";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiExtension,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { UserPermissions } from "@shared/types/user.types";
import { AuditLogService } from "./audit-log.service";
import { AuditLogPageDto } from "./dto/audit-log-page.dto";
import { QueryAuditLogsDto } from "./dto/query-audit-logs.dto";

@ApiTags("Audit Log")
@ApiBearerAuth()
@Controller("api/audit-logs")
@UseGuards(BearerAuthGuard, PermissionsGuard)
export class AuditLogController {
  constructor(private readonly auditLog: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: "Query audit logs (filtered, paginated)" })
  @ApiOkResponse({
    type: AuditLogPageDto,
    description: "Paginated audit log entries",
  })
  @ApiErrorResponses()
  @RequirePermissions(UserPermissions.AUDIT_LOG)
  @ApiExtension("x-permissions", [UserPermissions.AUDIT_LOG])
  query(@Query() q: QueryAuditLogsDto): AuditLogPageDto {
    const { items, total } = this.auditLog.query(q);
    return { items, total, limit: q.limit ?? 50, offset: q.offset ?? 0 };
  }
}
