import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { AccessArea } from "@shared/access/areas";
import { TaskRefResponseDto } from "@/core/dto/task-ref-response.dto";
import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { Audit } from "@/modules/audit-log/audit.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { JavaService } from "@/modules/java/java.service";
import {
  ModrinthSearchResponseDto,
  ModrinthVersionDto,
} from "@/modules/plugins/dto/modrinth-responses.dto";
import { ServerCreatedResponseDto } from "@/modules/servers/dto/server-created-response.dto";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";
import { diskStorage } from "multer";
import { InspectModrinthDto } from "./dto/inspect-modpack.dto";
import { InstallModpackDto } from "./dto/install-modpack.dto";
import { ModpackPreviewDto } from "./dto/modpack-preview.dto";
import { SearchModpacksDto } from "./dto/search-modpacks.dto";
import { ModpackInspector } from "./modpack-inspector.service";
import { modpackUploadDestination } from "./modpack-staging.service";
import { ModpacksService } from "./modpacks.service";

const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024;

@ApiTags("Modpacks")
@ApiBearerAuth()
@Controller("api/modpacks")
@UseGuards(BearerAuthGuard, AccessGuard)
@RequireAccess(AccessArea.SERVERS, "write")
export class ModpacksController {
  constructor(
    private readonly modpacks: ModpacksService,
    private readonly inspector: ModpackInspector,
    private readonly javaService: JavaService,
  ) {}

  @Get("search")
  @ApiOperation({ summary: "Search Fabric modpacks on Modrinth" })
  @ApiOkResponse({ type: ModrinthSearchResponseDto })
  @ApiErrorResponses([401, 403])
  search(
    @Query() query: SearchModpacksDto,
  ): Promise<ModrinthSearchResponseDto> {
    return this.modpacks.search(query);
  }

  @Get("projects/:projectId/versions")
  @ApiOperation({ summary: "List Fabric versions of a modpack" })
  @ApiParam({ name: "projectId", description: "Project ID or slug" })
  @ApiOkResponse({ type: [ModrinthVersionDto] })
  @ApiErrorResponses([401, 403, 404])
  listVersions(
    @Param("projectId") projectId: string,
  ): Promise<ModrinthVersionDto[]> {
    return this.modpacks.listVersions(projectId);
  }

  @Post("inspect")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Read an uploaded .mrpack and stage it for install",
    description: "Send the pack as multipart field file",
  })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({ destination: modpackUploadDestination }),
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @ApiOkResponse({ type: ModpackPreviewDto })
  @ApiErrorResponses([400, 401, 403])
  inspect(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: IUser,
  ): Promise<ModpackPreviewDto> {
    if (!file) throw new BadRequestException("Send a .mrpack file");
    return this.inspector.inspectUpload(user.id, file.path);
  }

  @Post("inspect/modrinth")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: "Download a Modrinth pack in the background and stage it",
    description:
      "The task reports download and read stages, its result is the preview",
  })
  @ApiAcceptedResponse({ type: TaskRefResponseDto })
  @ApiErrorResponses([400, 401, 403])
  inspectModrinth(
    @Body() dto: InspectModrinthDto,
    @CurrentUser() user: IUser,
  ): TaskRefResponseDto {
    const task = this.inspector.inspectModrinthTask(
      user.id,
      dto.projectId,
      dto.versionId,
    );
    return { taskId: task.id };
  }

  @Delete("staged/:packId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Drop an inspected pack that will not be installed",
  })
  @ApiParam({ name: "packId" })
  @ApiNoContentResponse()
  @ApiErrorResponses([401, 403])
  discard(
    @Param("packId", ParseUUIDPipe) packId: string,
    @CurrentUser() user: IUser,
  ): Promise<void> {
    return this.modpacks.discard(packId, user.id);
  }

  @Post("install")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Create a Fabric server from an inspected pack" })
  @Audit({
    action: AuditAction.SERVER_CREATE,
    category: AuditCategory.SERVER,
    resourceType: "server",
    resolve: ({ result }) => ({
      resourceId: result?.server?.id,
      resourceName: result?.server?.name,
      details: { source: "modpack" },
    }),
  })
  @ApiBody({ type: InstallModpackDto })
  @ApiAcceptedResponse({ type: ServerCreatedResponseDto })
  @ApiErrorResponses([400, 401, 403, 404])
  async install(
    @Body() dto: InstallModpackDto,
    @CurrentUser() user: IUser,
  ): Promise<ServerCreatedResponseDto> {
    await this.javaService.assertJavaPathAllowed(dto.javaPath, user);
    return this.modpacks.install(dto, user.id);
  }
}
