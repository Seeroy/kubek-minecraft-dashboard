import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { CurrentSession } from "@/modules/auth/decorators/current-session.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permission.guard";
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { IUserSession } from "@shared/types/session.types";
import type { IUser } from "@shared/types/user.types";
import { SessionPublicViewDto } from "./dto/session-public-view.dto";
import { SessionsService } from "./sessions.service";

@ApiTags("Sessions")
@ApiBearerAuth()
@Controller("api/sessions")
@UseGuards(BearerAuthGuard, PermissionsGuard)
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
  revoke(@CurrentUser() user: IUser, @Param("id") id: string): void {
    const sessions = this.sessionsService.listForUser(user.id);
    if (!sessions.some((s) => s.id === id)) {
      throw new NotFoundException("Session not found");
    }
    this.sessionsService.revoke(id);
  }
}
