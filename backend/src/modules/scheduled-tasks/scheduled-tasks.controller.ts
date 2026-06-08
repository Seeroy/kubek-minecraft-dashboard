import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { CheckServerAccess } from "@/modules/auth/decorators/check-server-access.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { RequirePermissions } from "@/modules/auth/decorators/require-permissions.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permission.guard";
import { ServerAccessGuard } from "@/modules/auth/guards/server-access.guard";
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
  Query,
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
import { ScheduledRunStatus } from "@shared/types/scheduler.types";
import { UserPermissions, type IUser } from "@shared/types/user.types";
import {
  CronPreviewResponseDto,
  ScheduledTaskEntity,
  ScheduledTaskRunEntity,
  ScheduledTaskRunsPageDto,
} from "./dto/scheduled-task-response.dto";
import {
  CreateScheduledTaskDto,
  PreviewCronDto,
  UpdateScheduledTaskDto,
} from "./dto/scheduled-task.dto";
import { ScheduledTasksService } from "./scheduled-tasks.service";

@ApiTags("ScheduledTasks")
@ApiBearerAuth()
@Controller("api")
@UseGuards(BearerAuthGuard, PermissionsGuard, ServerAccessGuard)
export class ScheduledTasksController {
  constructor(private readonly service: ScheduledTasksService) {}

  @Get("servers/:serverId/scheduled-tasks")
  @ApiOperation({ summary: "List scheduled tasks for server" })
  @RequirePermissions(UserPermissions.SCHEDULER_MANAGEMENT)
  @CheckServerAccess("serverId")
  @ApiOkResponse({
    type: [ScheduledTaskEntity],
    description: "Scheduled tasks for the server",
  })
  @ApiErrorResponses()
  list(@Param("serverId") serverId: string): ScheduledTaskEntity[] {
    return this.service.findByServerId(serverId);
  }

  @Get("servers/:serverId/scheduled-tasks/runs")
  @ApiOperation({ summary: "List task runs for server" })
  @RequirePermissions(UserPermissions.SCHEDULER_MANAGEMENT)
  @CheckServerAccess("serverId")
  @ApiOkResponse({
    type: ScheduledTaskRunsPageDto,
    description: "Task runs for the server",
  })
  @ApiErrorResponses()
  listRuns(
    @Param("serverId") serverId: string,
    @Query("taskId") taskId?: string,
    @Query("status") status?: ScheduledRunStatus,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ): ScheduledTaskRunsPageDto {
    return this.service.listRuns(serverId, {
      taskId,
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Post("servers/:serverId/scheduled-tasks")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create scheduled task" })
  @RequirePermissions(UserPermissions.SCHEDULER_MANAGEMENT)
  @CheckServerAccess("serverId")
  @ApiCreatedResponse({
    type: ScheduledTaskEntity,
    description: "Created scheduled task",
  })
  @ApiErrorResponses()
  create(
    @Param("serverId") serverId: string,
    @Body() dto: CreateScheduledTaskDto,
    @CurrentUser() user: IUser,
  ): ScheduledTaskEntity {
    // serverId from URL takes precedence to avoid mismatched body
    return this.service.create({ ...dto, serverId }, user);
  }

  @Get("scheduled-tasks/:id")
  @ApiOperation({ summary: "Get scheduled task" })
  @RequirePermissions(UserPermissions.SCHEDULER_MANAGEMENT)
  @ApiOkResponse({ type: ScheduledTaskEntity, description: "Scheduled task" })
  @ApiErrorResponses()
  get(@Param("id") id: string): ScheduledTaskEntity {
    return this.service.findById(id);
  }

  @Patch("scheduled-tasks/:id")
  @ApiOperation({ summary: "Update scheduled task" })
  @RequirePermissions(UserPermissions.SCHEDULER_MANAGEMENT)
  @ApiOkResponse({
    type: ScheduledTaskEntity,
    description: "Updated scheduled task",
  })
  @ApiErrorResponses()
  update(
    @Param("id") id: string,
    @Body() dto: UpdateScheduledTaskDto,
  ): ScheduledTaskEntity {
    return this.service.update(id, dto);
  }

  @Delete("scheduled-tasks/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete scheduled task" })
  @RequirePermissions(UserPermissions.SCHEDULER_MANAGEMENT)
  @ApiNoContentResponse({ description: "Task deleted" })
  @ApiErrorResponses()
  delete(@Param("id") id: string): void {
    this.service.delete(id);
  }

  @Post("scheduled-tasks/:id/toggle")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Toggle enabled flag" })
  @RequirePermissions(UserPermissions.SCHEDULER_MANAGEMENT)
  @ApiOkResponse({
    type: ScheduledTaskEntity,
    description: "Task with toggled enabled flag",
  })
  @ApiErrorResponses()
  toggle(@Param("id") id: string): ScheduledTaskEntity {
    return this.service.toggle(id);
  }

  @Post("scheduled-tasks/:id/run-now")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Run scheduled task immediately" })
  @RequirePermissions(UserPermissions.SCHEDULER_MANAGEMENT)
  @ApiOkResponse({
    type: ScheduledTaskRunEntity,
    description: "Result of the immediate run",
  })
  @ApiErrorResponses()
  runNow(@Param("id") id: string): Promise<ScheduledTaskRunEntity> {
    return this.service.runNow(id);
  }

  @Get("scheduled-tasks/:id/runs")
  @ApiOperation({ summary: "List runs of a scheduled task" })
  @RequirePermissions(UserPermissions.SCHEDULER_MANAGEMENT)
  @ApiOkResponse({
    type: [ScheduledTaskRunEntity],
    description: "Runs of the scheduled task",
  })
  @ApiErrorResponses()
  taskRuns(
    @Param("id") id: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ): ScheduledTaskRunEntity[] {
    return this.service.listTaskRuns(id, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Post("scheduled-tasks/preview-cron")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Preview next runs of a cron expression" })
  @RequirePermissions(UserPermissions.SCHEDULER_MANAGEMENT)
  @ApiOkResponse({
    type: CronPreviewResponseDto,
    description: "Next fire times for the expression",
  })
  @ApiErrorResponses()
  previewCron(@Body() dto: PreviewCronDto): CronPreviewResponseDto {
    return this.service.previewCron(dto);
  }
}
