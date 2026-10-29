import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { IUser } from "@shared/types/user.types";
import {
  NotificationPrefsDto,
  NotificationsPageDto,
  NotificationsQueryDto,
} from "./dto/notifications.dto";
import { NotificationsService } from "./notifications.service";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("api/notifications")
@UseGuards(BearerAuthGuard, AccessGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Inbox of the current user, newest first" })
  @ApiOkResponse({ type: NotificationsPageDto })
  @ApiErrorResponses([400, 401])
  list(
    @CurrentUser() user: IUser,
    @Query() query: NotificationsQueryDto,
  ): NotificationsPageDto {
    return this.notifications.list(user.id, {
      limit: query.limit,
      unreadOnly: query.unread,
      cursor: query.cursor,
    });
  }

  @Post("read-all")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Mark every notification as read" })
  @ApiNoContentResponse()
  @ApiErrorResponses([401])
  readAll(@CurrentUser() user: IUser): void {
    this.notifications.markAllRead(user.id);
  }

  @Post(":id/read")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Mark a notification as read" })
  @ApiNoContentResponse()
  @ApiErrorResponses([401])
  read(@CurrentUser() user: IUser, @Param("id") id: string): void {
    this.notifications.markRead(user.id, id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a notification" })
  @ApiNoContentResponse()
  @ApiErrorResponses([401, 404])
  remove(@CurrentUser() user: IUser, @Param("id") id: string): void {
    this.notifications.remove(user.id, id);
  }

  @Get("prefs")
  @ApiOperation({ summary: "Channels the current user gets each category on" })
  @ApiOkResponse({ type: NotificationPrefsDto })
  @ApiErrorResponses([401])
  getPrefs(@CurrentUser() user: IUser): NotificationPrefsDto {
    return { prefs: this.notifications.getPrefs(user.id) };
  }

  @Put("prefs")
  @ApiOperation({ summary: "Update notification channels per category" })
  @ApiOkResponse({ type: NotificationPrefsDto })
  @ApiErrorResponses([400, 401])
  setPrefs(
    @CurrentUser() user: IUser,
    @Body() body: NotificationPrefsDto,
  ): NotificationPrefsDto {
    return { prefs: this.notifications.setPrefs(user.id, body.prefs) };
  }
}
