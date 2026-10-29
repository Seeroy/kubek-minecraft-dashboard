import { RequireServerView } from "@/modules/auth/decorators/require-access.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { BearerAuthGuard } from "../auth/guards/bearer.guard";
import { canSeeServer } from "@shared/access/can";
import type { ITask } from "@shared/types/task.types";
import type { IUser } from "@shared/types/user.types";
import { TaskEntity } from "./dto/task.entity";
import { TasksService } from "./tasks.service";

@ApiTags("Tasks")
@ApiBearerAuth()
@Controller("api/tasks")
@UseGuards(BearerAuthGuard, AccessGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: "Get all active tasks" })
  @ApiOkResponse({ type: [TaskEntity] })
  @ApiErrorResponses()
  @RequireServerView()
  @ApiResponse({ status: 403, description: "Requires read access to servers" })
  getAll(@CurrentUser() user: IUser): TaskEntity[] {
    return this.tasksService.getAll().filter((task) => visible(user, task));
  }

  @Get(":id")
  @ApiOperation({ summary: "Get task by ID" })
  @ApiParam({ name: "id", description: "Task ID", example: "a1b2c3d4" })
  @ApiOkResponse({ type: TaskEntity })
  @ApiErrorResponses()
  @ApiResponse({ status: 404, description: "Task not found" })
  @RequireServerView()
  @ApiResponse({ status: 403, description: "Requires read access to servers" })
  getOne(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
  ): TaskEntity | null {
    const task = this.tasksService.getTask(id);
    return task && visible(user, task) ? task : null;
  }
}

// Server tasks follow the server list, panel ones stay visible
function visible(user: IUser, task: ITask): boolean {
  const serverId = task.meta?.serverId;
  return !serverId || canSeeServer(user, serverId);
}
