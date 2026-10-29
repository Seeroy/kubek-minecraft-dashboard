import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { AccessArea } from "@shared/access/areas";
import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { TaskRefResponseDto } from "@/core/dto/task-ref-response.dto";
import { TaskErrorCode } from "@/core/errors/error-codes";
import { Audit, type AuditMeta } from "@/modules/audit-log/audit.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { TasksService } from "@/modules/tasks/tasks.service";
import {
  Body,
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
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import { TaskStatus, TaskSteps, TaskType } from "@shared/types/task.types";
import type { IUser } from "@shared/types/user.types";
import { BearerAuthGuard } from "../auth/guards/bearer.guard";
import {
  CustomJavaRequestDto,
  JavaPathValidationDto,
} from "./dto/custom-java.dto";
import { JavaVersionEntity } from "./dto/java-version.entity";
import { JavaService } from "./java.service";

const javaAudit = (
  action: string,
  resolve?: AuditMeta["resolve"],
): AuditMeta => ({
  action,
  category: AuditCategory.SETTINGS,
  resourceType: "java",
  resolve,
});

@ApiTags("Java")
@ApiBearerAuth()
@Controller("api/java")
@UseGuards(BearerAuthGuard, AccessGuard)
@RequireAccess(AccessArea.JAVA, "read")
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
  @ApiResponse({ status: 403, description: "Requires java access" })
  async getAllJavaVersions(): Promise<JavaVersionEntity[]> {
    const installations = await this.javaService.getAllJavaInstallations();
    return installations;
  }

  /**
   * Validate an arbitrary local Java path without registering it.
   */
  @Post("custom/validate")
  @RequireAccess(AccessArea.JAVA, "manage")
  @HttpCode(200)
  @ApiOperation({ summary: "Validate a local Java path" })
  @ApiOkResponse({ type: JavaPathValidationDto })
  @ApiErrorResponses()
  @ApiResponse({ status: 403, description: "Requires java access" })
  async validateJavaPath(
    @Body() body: CustomJavaRequestDto,
  ): Promise<JavaPathValidationDto> {
    return this.javaService.validateJavaPath(body.path);
  }

  /**
   * Register a custom Java installation from a local path.
   */
  @Post("custom")
  @RequireAccess(AccessArea.JAVA, "manage")
  @HttpCode(201)
  @ApiOperation({ summary: "Register a custom Java installation" })
  @ApiCreatedResponse({ type: JavaVersionEntity })
  @ApiErrorResponses()
  @ApiResponse({ status: 403, description: "Requires java access" })
  @Audit(
    javaAudit(AuditAction.JAVA_CUSTOM_ADD, ({ result, req }) => ({
      resourceId: result?.version,
      resourceName: result?.name ?? req.body?.path,
      details: { path: result?.path ?? req.body?.path },
    })),
  )
  async addCustomJava(
    @Body() body: CustomJavaRequestDto,
  ): Promise<JavaVersionEntity> {
    return this.javaService.addCustomJava(body.path, body.name);
  }

  /**
   * Unregister a custom Java installation, files are left untouched.
   */
  @Delete("custom/:id")
  @RequireAccess(AccessArea.JAVA, "manage")
  @HttpCode(204)
  @ApiOperation({ summary: "Unregister a custom Java installation" })
  @ApiParam({ name: "id", description: "Custom Java registry id" })
  @ApiNoContentResponse({ description: "Custom Java unregistered" })
  @ApiErrorResponses()
  @ApiResponse({ status: 403, description: "Requires java access" })
  @Audit(javaAudit(AuditAction.JAVA_CUSTOM_REMOVE))
  async removeCustomJava(@Param("id") id: string): Promise<void> {
    await this.javaService.removeCustomJava(id);
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
  @ApiResponse({ status: 403, description: "Requires java access" })
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
  @RequireAccess(AccessArea.JAVA, "write")
  @HttpCode(202)
  @ApiOperation({ summary: "Install a specific Java version" })
  @ApiParam({ name: "version", description: "Java version to install" })
  @ApiAcceptedResponse({ type: TaskRefResponseDto })
  @ApiErrorResponses()
  @ApiResponse({ status: 403, description: "Requires java access" })
  @Audit(
    javaAudit(AuditAction.JAVA_INSTALL, ({ req }) => ({
      resourceName: `Java ${String(req.params.version)}`,
    })),
  )
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
  @RequireAccess(AccessArea.JAVA, "manage")
  @HttpCode(204)
  @ApiOperation({ summary: "Delete an installed Java version" })
  @ApiParam({ name: "version", description: "Java version to delete" })
  @ApiNoContentResponse({ description: "Java version deleted" })
  @ApiErrorResponses()
  @ApiResponse({ status: 403, description: "Requires java access" })
  @Audit(
    javaAudit(AuditAction.JAVA_DELETE, ({ req }) => ({
      resourceName: `Java ${String(req.params.version)}`,
    })),
  )
  async deleteJavaVersion(@Param("version") version: string): Promise<void> {
    await this.javaService.deleteJavaVersion(version);
  }
}
