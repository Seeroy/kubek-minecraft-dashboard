import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { Audit, auditNote } from "@/modules/audit-log/audit.decorator";
import { CurrentSession } from "@/modules/auth/decorators/current-session.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type { IUserSession } from "@shared/types/session.types";
import type { IUser } from "@shared/types/user.types";
import type { Request } from "express";
import { SessionPublicViewDto } from "./dto/session-public-view.dto";
import { SessionsService } from "./sessions.service";

@ApiTags("Sessions")
@ApiBearerAuth()
@Controller("api/sessions")
@UseGuards(BearerAuthGuard, AccessGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiOperation({ summary: "List active sessions of the current user" })
  @ApiOkResponse({
    description: "List of sessions",
    type: [SessionPublicViewDto],
  })
  @ApiErrorResponses([401])
  list(
    @CurrentUser() user: IUser,
    @CurrentSession() session: IUserSession | undefined,
  ): SessionPublicViewDto[] {
    return this.sessionsService.listForUser(user.id, session?.id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Revoke all sessions except the current one" })
  @ApiNoContentResponse({ description: "Sessions revoked" })
  @ApiErrorResponses([401])
  @Audit({
    action: AuditAction.AUTH_SESSIONS_REVOKE_ALL,
    category: AuditCategory.AUTH,
    resourceType: "session",
  })
  revokeAll(
    @CurrentUser() user: IUser,
    @CurrentSession() session: IUserSession | undefined,
  ): void {
    this.sessionsService.revokeAllForUser(user.id, session?.id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Revoke a specific session" })
  @ApiNoContentResponse({ description: "Session revoked" })
  @ApiErrorResponses([401, 404])
  @Audit({
    action: AuditAction.AUTH_SESSION_REVOKE,
    category: AuditCategory.AUTH,
    resourceType: "session",
  })
  revoke(
    @CurrentUser() user: IUser,
    @Param("id") id: string,
    @Req() req: Request,
  ): void {
    const session = this.sessionsService
      .listForUser(user.id)
      .find((s) => s.id === id);
    if (!session) {
      throw new NotFoundException("Session not found");
    }
    // The ended session's device, the entry itself has the actor's
    auditNote(req, {
      details: { sessionIp: session.ip, sessionClient: session.userAgent },
    });
    this.sessionsService.revoke(id);
  }
}
