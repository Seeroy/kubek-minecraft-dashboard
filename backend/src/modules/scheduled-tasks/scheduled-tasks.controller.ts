import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { AccessArea } from "@shared/access/areas";
import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { canAccessServer } from "@/core/utils/serverAccess";
import { Audit, auditNote } from "@/modules/audit-log/audit.decorator";
import { CheckServerAccess } from "@/modules/auth/decorators/check-server-access.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { ServerAccessGuard } from "@/modules/auth/guards/server-access.guard";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
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
import { AuditAction } from "@shared/types/audit.types";
import { ScheduledRunStatus } from "@shared/types/scheduler.types";
import type { IUser } from "@shared/types/user.types";
import type { Request } from "express";
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
import { scheduledAudit, taskChanges, taskNote } from "./scheduled-tasks.audit";

@ApiTags("ScheduledTasks")
@ApiBearerAuth()
@Controller("api")
@UseGuards(BearerAuthGuard, AccessGuard, ServerAccessGuard)
export class ScheduledTasksController {
  constructor(private readonly service: ScheduledTasksService) {}

  @Get("servers/:serverId/scheduled-tasks")
  @ApiOperation({ summary: "List scheduled tasks for server" })
  @RequireAccess(AccessArea.SCHEDULER, "read")
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
  @RequireAccess(AccessArea.SCHEDULER, "read")
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
  @RequireAccess(AccessArea.SCHEDULER, "write")
  @CheckServerAccess("serverId")
  @ApiCreatedResponse({
    type: ScheduledTaskEntity,
    description: "Created scheduled task",
  })
  @ApiErrorResponses()
  @Audit(scheduledAudit(AuditAction.SCHEDULED_TASK_CREATE))
  create(
    @Param("serverId") serverId: string,
    @Body() dto: CreateScheduledTaskDto,
    @CurrentUser() user: IUser,
    @Req() req: Request,
  ): ScheduledTaskEntity {
    // serverId from URL takes precedence to avoid mismatched body
    const task = this.service.create({ ...dto, serverId }, user);
    auditNote(req, taskNote(task));
    return task;
  }

  @Get("scheduled-tasks/:id")
  @ApiOperation({ summary: "Get scheduled task" })
  @RequireAccess(AccessArea.SCHEDULER, "read")
  @ApiOkResponse({ type: ScheduledTaskEntity, description: "Scheduled task" })
  @ApiErrorResponses()
  get(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
  ): ScheduledTaskEntity {
    return this.accessibleTask(id, user);
  }

  @Patch("scheduled-tasks/:id")
  @ApiOperation({ summary: "Update scheduled task" })
  @RequireAccess(AccessArea.SCHEDULER, "write")
  @ApiOkResponse({
    type: ScheduledTaskEntity,
    description: "Updated scheduled task",
  })
  @ApiErrorResponses()
  @Audit(scheduledAudit(AuditAction.SCHEDULED_TASK_UPDATE))
  update(
    @Param("id") id: string,
    @Body() dto: UpdateScheduledTaskDto,
    @CurrentUser() user: IUser,
    @Req() req: Request,
  ): ScheduledTaskEntity {
    const before = this.accessibleTask(id, user);
    const after = this.service.update(id, dto, user);
    auditNote(req, taskNote(after, { changes: taskChanges(before, after) }));
    return after;
  }

  @Delete("scheduled-tasks/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete scheduled task" })
  @RequireAccess(AccessArea.SCHEDULER, "manage")
  @ApiNoContentResponse({ description: "Task deleted" })
  @ApiErrorResponses()
  @Audit(scheduledAudit(AuditAction.SCHEDULED_TASK_DELETE))
  delete(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
    @Req() req: Request,
  ): void {
    auditNote(req, taskNote(this.accessibleTask(id, user)));
    this.service.delete(id);
  }

  @Post("scheduled-tasks/:id/toggle")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Toggle enabled flag" })
  @RequireAccess(AccessArea.SCHEDULER, "write")
  @ApiOkResponse({
    type: ScheduledTaskEntity,
    description: "Task with toggled enabled flag",
  })
  @ApiErrorResponses()
  @Audit(scheduledAudit(AuditAction.SCHEDULED_TASK_TOGGLE))
  toggle(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
    @Req() req: Request,
  ): ScheduledTaskEntity {
    this.accessibleTask(id, user);
    const task = this.service.toggle(id);
    auditNote(req, taskNote(task, { details: { enabled: task.enabled } }));
    return task;
  }

  @Post("scheduled-tasks/:id/run-now")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Run scheduled task immediately" })
  @RequireAccess(AccessArea.SCHEDULER, "write")
  @ApiOkResponse({
    type: ScheduledTaskRunEntity,
    description: "Result of the immediate run",
  })
  @ApiErrorResponses()
  @Audit(scheduledAudit(AuditAction.SCHEDULED_TASK_RUN))
  runNow(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
    @Req() req: Request,
  ): Promise<ScheduledTaskRunEntity> {
    auditNote(req, taskNote(this.accessibleTask(id, user)));
    return this.service.runNow(id);
  }

  @Get("scheduled-tasks/:id/runs")
  @ApiOperation({ summary: "List runs of a scheduled task" })
  @RequireAccess(AccessArea.SCHEDULER, "read")
  @ApiOkResponse({
    type: [ScheduledTaskRunEntity],
    description: "Runs of the scheduled task",
  })
  @ApiErrorResponses()
  taskRuns(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ): ScheduledTaskRunEntity[] {
    this.accessibleTask(id, user);
    return this.service.listTaskRuns(id, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Post("scheduled-tasks/preview-cron")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Preview next runs of a cron expression" })
  @RequireAccess(AccessArea.SCHEDULER, "read")
  @ApiOkResponse({
    type: CronPreviewResponseDto,
    description: "Next fire times for the expression",
  })
  @ApiErrorResponses()
  previewCron(@Body() dto: PreviewCronDto): CronPreviewResponseDto {
    return this.service.previewCron(dto);
  }

  // Tasks of servers you can't see look like they don't exist
  private accessibleTask(id: string, user: IUser): ScheduledTaskEntity {
    const task = this.service.findById(id);
    if (!canAccessServer(user, task.serverId)) {
      throw new NotFoundException("Scheduled task not found");
    }
    return task;
  }
}
