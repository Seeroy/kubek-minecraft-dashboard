import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiExtension,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { UserPermissions } from "@shared/types/user.types";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { BearerAuthGuard } from "../auth/guards/bearer.guard";
import { PermissionsGuard } from "../auth/guards/permission.guard";
import { TaskEntity } from "./dto/task.entity";
import { TasksService } from "./tasks.service";

@ApiTags("Tasks")
@ApiBearerAuth()
@Controller("api/tasks")
@UseGuards(BearerAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: "Get all active tasks" })
  @ApiOkResponse({ type: [TaskEntity] })
  @ApiErrorResponses()
  @RequirePermissions(UserPermissions.SERVERS_VIEW)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_VIEW])
  @ApiResponse({ status: 403, description: "Requires SERVERS_VIEW permission" })
  getAll(): TaskEntity[] {
    return this.tasksService.getAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get task by ID" })
  @ApiParam({ name: "id", description: "Task ID", example: "a1b2c3d4" })
  @ApiOkResponse({ type: TaskEntity })
  @ApiErrorResponses()
  @ApiResponse({ status: 404, description: "Task not found" })
  @RequirePermissions(UserPermissions.SERVERS_VIEW)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_VIEW])
  @ApiResponse({ status: 403, description: "Requires SERVERS_VIEW permission" })
  getOne(@Param("id") id: string): TaskEntity | null {
    return this.tasksService.getTask(id);
  }
}
