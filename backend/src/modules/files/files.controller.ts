import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { AccessArea, type AccessLevel } from "@shared/access/areas";
import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { TaskRefResponseDto } from "@/core/dto/task-ref-response.dto";
import { Audit } from "@/modules/audit-log/audit.decorator";
import { CheckServerAccess } from "@/modules/auth/decorators/check-server-access.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { ServerAccessGuard } from "@/modules/auth/guards/server-access.guard";
import { FilesTasksService } from "@/modules/files/files-tasks.service";
import {
  applyDecorators,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  Post,
  Put,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction } from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";
import { FileContentResponseDto } from "./dto/file-content-response.dto";
import {
  BatchPathsDto,
  CreateArchiveDto,
  CreateDirectoryDto,
  ExtractArchiveDto,
  FileOperationDto,
  RenameFileDto,
  WriteFileDto,
} from "./dto/file-operations.dto";
import { FileEntity } from "./dto/file.entity";
import { FileManagerService } from "./file-manager.service";
import { fileAudit, joinPath } from "./files.audit";

/**
 * serverId query, files access level on that server, common errors
 * Put it above the route ApiQuery so serverId is last in the docs
 */
function ServerFileRoute(
  level: AccessLevel,
  opts: { describe403?: boolean } = {},
) {
  return applyDecorators(
    ApiQuery({
      name: "serverId",
      description: "Server identifier",
      required: true,
    }),
    RequireAccess(AccessArea.FILES, level),
    CheckServerAccess("serverId"),
    ...(opts.describe403
      ? [
          ApiResponse({
            status: 403,
            description: `Requires files ${level} access and access to serverId`,
          }),
        ]
      : []),
    ApiErrorResponses(),
  );
}

@ApiTags("Files")
@ApiBearerAuth()
@Controller("api/files")
@UseGuards(BearerAuthGuard, AccessGuard, ServerAccessGuard)
export class FilesController {
  constructor(
    private readonly fileManagerService: FileManagerService,
    private readonly filesTasksService: FilesTasksService,
  ) {}

  @Get("scan")
  @ApiOperation({
    summary: "Scan directory contents",
    description: "Get list of files and directories in a specified server path",
  })
  @ServerFileRoute("read", { describe403: true })
  @ApiQuery({
    name: "path",
    description: "Directory path to scan",
  })
  @ApiOkResponse({ type: [FileEntity] })
  async scanDirectory(
    @Query() query: { serverId: string; path?: string },
  ): Promise<FileEntity[]> {
    if (!query.serverId) {
      throw new ForbiddenException();
    }
    const path = query.path || "";
    return this.fileManagerService.scanDirectory(query.serverId, path);
  }

  @Get("search")
  @ApiOperation({
    summary: "Search files by name",
    description:
      "Recursively search files and directories by name within a server path",
  })
  @ServerFileRoute("read", { describe403: true })
  @ApiQuery({
    name: "query",
    description: "Case-insensitive name substring",
    required: true,
  })
  @ApiQuery({
    name: "path",
    description: "Base directory to search within",
    required: false,
  })
  @ApiOkResponse({ type: [FileEntity] })
  async searchFiles(
    @Query() query: { serverId: string; query: string; path?: string },
  ): Promise<FileEntity[]> {
    if (!query.serverId) {
      throw new ForbiddenException();
    }
    return this.fileManagerService.searchFiles(
      query.serverId,
      query.query || "",
      query.path || "",
    );
  }

  @Get("content")
  @ApiOperation({
    summary: "Read file content",
    description: "Read file content as text (suitable for editing)",
  })
  @ServerFileRoute("read", { describe403: true })
  @ApiQuery({
    name: "path",
    description: "Path to the file",
    required: true,
  })
  @ApiOkResponse({ type: FileContentResponseDto })
  async readFile(
    @Query() query: { serverId: string; path: string },
  ): Promise<FileContentResponseDto> {
    const buffer = await this.fileManagerService.readFile(
      query.serverId,
      query.path,
    );
    return { content: buffer.toString() };
  }

  @Get("download")
  @ApiOperation({
    summary: "Download file",
    description:
      "Download file as binary stream with Content-Disposition header",
  })
  @ServerFileRoute("read", { describe403: true })
  @ApiQuery({
    name: "path",
    description: "Path to the file to download",
    required: true,
  })
  @Header("Content-Type", "application/octet-stream")
  @ApiResponse({
    status: 200,
    description: "Binary file stream (application/octet-stream)",
  })
  async downloadFile(
    @Query() query: { serverId: string; path: string },
  ): Promise<StreamableFile> {
    const buffer = await this.fileManagerService.readFile(
      query.serverId,
      query.path,
    );
    return new StreamableFile(buffer);
  }

  @Post("content")
  @HttpCode(204)
  @ApiOperation({
    summary: "Write file content",
    description:
      "Write/upload content to a file. Creates file if it doesn't exist.",
  })
  @ServerFileRoute("write", { describe403: true })
  @ApiBody({ type: WriteFileDto })
  @ApiNoContentResponse({ description: "File written successfully" })
  @Audit(fileAudit(AuditAction.FILE_WRITE, (body) => ({ path: body.path })))
  async writeFile(
    @Query("serverId") serverId: string,
    @Body() body: WriteFileDto,
  ): Promise<void> {
    await this.fileManagerService.writeFile(serverId, body.path, body.data);
  }

  @Post("directory")
  @HttpCode(201)
  @ApiOperation({
    summary: "Create directory",
    description: "Create a new directory at the specified path",
  })
  @ServerFileRoute("write", { describe403: true })
  @ApiBody({ type: CreateDirectoryDto })
  @ApiCreatedResponse({ description: "Directory created successfully" })
  @Audit(
    fileAudit(AuditAction.FILE_CREATE_DIRECTORY, (body) => ({
      path: joinPath(body.path, body.name),
    })),
  )
  async createDirectory(
    @Query("serverId") serverId: string,
    @Body() body: CreateDirectoryDto,
  ): Promise<void> {
    await this.fileManagerService.createDirectory(
      serverId,
      body.path,
      body.name,
    );
  }

  @Put("rename")
  @HttpCode(204)
  @ApiOperation({
    summary: "Rename file or directory",
    description: "Rename a file or directory to a new name",
  })
  @ServerFileRoute("write", { describe403: true })
  @ApiBody({ type: RenameFileDto })
  @ApiNoContentResponse({ description: "File/directory renamed successfully" })
  @Audit(
    fileAudit(AuditAction.FILE_RENAME, (body) => ({
      path: body.path,
      details: { newName: body.newName },
    })),
  )
  async renameFile(
    @Query("serverId") serverId: string,
    @Body() body: RenameFileDto,
  ): Promise<void> {
    await this.fileManagerService.renameFile(serverId, body.path, body.newName);
  }

  @Delete("file")
  @HttpCode(204)
  @ApiOperation({
    summary: "Delete file",
    description: "Delete a specific file",
  })
  @ServerFileRoute("manage", { describe403: true })
  @ApiBody({
    description: "File path to delete",
    type: FileOperationDto,
  })
  @ApiNoContentResponse({ description: "File deleted successfully" })
  @Audit(fileAudit(AuditAction.FILE_DELETE, (body) => ({ path: body.path })))
  async deleteFile(
    @Query("serverId") serverId: string,
    @Body() body: FileOperationDto,
  ): Promise<void> {
    await this.fileManagerService.deleteFile(serverId, body.path);
  }

  @Post("upload")
  @HttpCode(201)
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({
    summary: "Upload file to directory",
    description: "Upload a file to the specified directory path",
  })
  @ServerFileRoute("write", { describe403: true })
  @ApiQuery({
    name: "path",
    description: "Directory path where to upload the file",
    required: true,
  })
  @ApiCreatedResponse({ description: "File uploaded successfully" })
  @Audit(
    fileAudit(AuditAction.FILE_UPLOAD, (_, req) => ({
      path: joinPath(req.query.path, req.file?.originalname),
      details: { size: req.file?.size },
    })),
  )
  async uploadFile(
    @Query("serverId") serverId: string,
    @Query("path") path: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<void> {
    if (!file) {
      throw new ForbiddenException("No file provided");
    }

    await this.fileManagerService.uploadFile(serverId, path, file);
    return;
  }

  @Post("batch-delete")
  @HttpCode(202)
  @ApiOperation({
    summary: "Batch delete files and directories",
    description:
      "Schedule a background task that deletes the given paths and emits progress via WebSocket",
  })
  @ServerFileRoute("manage")
  @ApiBody({ type: BatchPathsDto })
  @ApiAcceptedResponse({ type: TaskRefResponseDto })
  @Audit(
    fileAudit(AuditAction.FILE_DELETE, (body) => ({
      path: body.paths?.length === 1 ? body.paths[0] : undefined,
      details: body.paths?.length === 1 ? undefined : { paths: body.paths },
    })),
  )
  async batchDelete(
    @Query("serverId") serverId: string,
    @Body() body: BatchPathsDto,
    @CurrentUser() user: IUser,
  ): Promise<TaskRefResponseDto> {
    const { task } = await this.filesTasksService.deletePathsTask(
      serverId,
      body.paths,
      user.id,
    );
    return { taskId: task.id };
  }

  @Post("extract")
  @HttpCode(202)
  @ApiOperation({
    summary: "Extract a ZIP archive into a sibling subdirectory",
    description: "Schedules a background task; emits progress via WebSocket",
  })
  @ServerFileRoute("manage")
  @ApiBody({ type: ExtractArchiveDto })
  @ApiAcceptedResponse({ type: TaskRefResponseDto })
  @Audit(fileAudit(AuditAction.FILE_EXTRACT, (body) => ({ path: body.path })))
  async extractArchive(
    @Query("serverId") serverId: string,
    @Body() body: ExtractArchiveDto,
    @CurrentUser() user: IUser,
  ): Promise<TaskRefResponseDto> {
    const { task } = await this.filesTasksService.extractArchiveTask(
      serverId,
      body.path,
      user.id,
    );
    return { taskId: task.id };
  }

  @Post("archive")
  @HttpCode(202)
  @ApiOperation({
    summary: "Create a ZIP archive from selected paths",
    description:
      "Schedule a background task that creates an archive in destPath and emits progress via WebSocket",
  })
  @ServerFileRoute("manage")
  @ApiBody({ type: CreateArchiveDto })
  @ApiAcceptedResponse({ type: TaskRefResponseDto })
  @Audit(
    fileAudit(AuditAction.FILE_ARCHIVE, (body) => ({
      path: joinPath(body.destPath, `${body.archiveName}.zip`),
      details: { paths: body.paths },
    })),
  )
  async createArchive(
    @Query("serverId") serverId: string,
    @Body() body: CreateArchiveDto,
    @CurrentUser() user: IUser,
  ): Promise<TaskRefResponseDto> {
    const { task } = await this.filesTasksService.createArchiveTask(
      serverId,
      body.paths,
      body.destPath,
      body.archiveName,
      user.id,
    );
    return { taskId: task.id };
  }

  @Delete("directory")
  @HttpCode(204)
  @ApiOperation({
    summary: "Delete directory",
    description: "Delete a directory and all its contents (recursive)",
  })
  @ServerFileRoute("manage", { describe403: true })
  @ApiBody({
    description: "Directory path to delete",
    type: FileOperationDto,
  })
  @ApiNoContentResponse({ description: "Directory deleted successfully" })
  @Audit(fileAudit(AuditAction.FILE_DELETE, (body) => ({ path: body.path })))
  async deleteDirectory(
    @Query("serverId") serverId: string,
    @Body() body: FileOperationDto,
  ): Promise<void> {
    await this.fileManagerService.deleteDirectory(serverId, body.path);
  }
}
