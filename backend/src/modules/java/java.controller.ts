import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { TaskRefResponseDto } from "@/core/dto/task-ref-response.dto";
import { TaskErrorCode } from "@/core/errors/error-codes";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { RequirePermissions } from "@/modules/auth/decorators/require-permissions.decorator";
import { PermissionsGuard } from "@/modules/auth/guards/permission.guard";
import { TasksService } from "@/modules/tasks/tasks.service";
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiExtension,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { TaskStatus, TaskSteps, TaskType } from "@shared/types/task.types";
import { type IUser, UserPermissions } from "@shared/types/user.types";
import { BearerAuthGuard } from "../auth/guards/bearer.guard";
import { JavaVersionEntity } from "./dto/java-version.entity";
import { JavaService } from "./java.service";

@ApiTags("Java")
@ApiBearerAuth()
@Controller("api/java")
@UseGuards(BearerAuthGuard, PermissionsGuard)
@RequirePermissions(UserPermissions.MANAGE_JAVA)
export class JavaController {
  constructor(
    private readonly javaService: JavaService,
    private readonly tasksService: TasksService,
  ) {}

  /**
   * Get all available Java versions.
   * @returns List of Java installations
   */
  @Get()
  @ApiOperation({ summary: "Get all available Java versions" })
  @ApiOkResponse({ type: [JavaVersionEntity] })
  @ApiErrorResponses()
  @ApiResponse({ status: 403, description: "Requires MANAGE_JAVA permission" })
  @ApiExtension("x-permissions", [UserPermissions.MANAGE_JAVA])
  async getAllJavaVersions(): Promise<JavaVersionEntity[]> {
    const installations = await this.javaService.getAllJavaInstallations();
    return installations;
  }

  /**
   * Get recommended Java version for a Minecraft version.
   * @param gameVersion - Minecraft version
   * @returns Recommended Java version
   */
  @Get(":gameVersion")
  @ApiOperation({
    summary: "Get recommended Java version for Minecraft version",
  })
  @ApiParam({ name: "gameVersion", description: "Minecraft version" })
  @ApiOkResponse({
    description: "Recommended major Java version, or null when unknown",
    type: Number,
    nullable: true,
  })
  @ApiErrorResponses()
  @ApiResponse({ status: 403, description: "Requires MANAGE_JAVA permission" })
  @ApiExtension("x-permissions", [UserPermissions.MANAGE_JAVA])
  async getJavaVersionForGame(
    @Param("gameVersion") gameVersion: string,
  ): Promise<number | null> {
    const version = await this.javaService.getJavaVersionForGame(gameVersion);
    return version;
  }

  /**
   * Install a specific Java version.
   * @param version - Java version to install
   * @param user - User object
   * @returns Installation result
   */
  @Post("install/:version")
  @HttpCode(202)
  @ApiOperation({ summary: "Install a specific Java version" })
  @ApiParam({ name: "version", description: "Java version to install" })
  @ApiAcceptedResponse({ type: TaskRefResponseDto })
  @ApiErrorResponses()
  @ApiResponse({ status: 403, description: "Requires MANAGE_JAVA permission" })
  @ApiExtension("x-permissions", [UserPermissions.MANAGE_JAVA])
  installJavaVersion(
    @Param("version") version: string,
    @CurrentUser() user: IUser,
  ): TaskRefResponseDto {
    const taskId = this.tasksService.createTask(
      TaskType.JAVA_INSTALL,
      {
        javaVersion: version,
      },
      user.id,
    );
    this.tasksService.updateTask(taskId, {
      step: TaskSteps.DOWNLOADING_JAVA,
      progress: 0,
    });

    this.javaService.installJavaVersion(version, taskId).catch((err) => {
      this.tasksService.updateTask(taskId, {
        status: TaskStatus.FAILED,
        step: TaskSteps.FAILED,
        error: {
          code: TaskErrorCode.JAVA_INSTALL_ERROR,
          message: err?.message || String(err),
        },
      });
    });
    return { taskId };
  }

  /**
   * Delete an installed Java version.
   * @param version - Java version to delete
   * @returns Deletion result
   */
  @Delete(":version")
  @HttpCode(204)
  @ApiOperation({ summary: "Delete an installed Java version" })
  @ApiParam({ name: "version", description: "Java version to delete" })
  @ApiNoContentResponse({ description: "Java version deleted" })
  @ApiErrorResponses()
  @ApiResponse({ status: 403, description: "Requires MANAGE_JAVA permission" })
  @ApiExtension("x-permissions", [UserPermissions.MANAGE_JAVA])
  async deleteJavaVersion(@Param("version") version: string): Promise<void> {
    await this.javaService.deleteJavaVersion(version);
  }
}
