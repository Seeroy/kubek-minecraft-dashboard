import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { TaskRefResponseDto } from "@/core/dto/task-ref-response.dto";
import { CheckServerAccess } from "@/modules/auth/decorators/check-server-access.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { RequirePermissions } from "@/modules/auth/decorators/require-permissions.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permission.guard";
import { ServerAccessGuard } from "@/modules/auth/guards/server-access.guard";
import { FilesTasksService } from "@/modules/files/files-tasks.service";
import {
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
  ApiExtension,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { IUser } from "@shared/types/user.types";
import { UserPermissions } from "@shared/types/user.types";
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

@ApiTags("Files")
@ApiBearerAuth()
@Controller("api/files")
@UseGuards(BearerAuthGuard, PermissionsGuard, ServerAccessGuard)
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
  @ApiQuery({
    name: "serverId",
    description: "Server identifier",
    required: true,
  })
  @ApiQuery({
    name: "path",
    description: "Directory path to scan",
  })
  @RequirePermissions(UserPermissions.FILE_MANAGER)
  @CheckServerAccess("serverId")
  @ApiExtension("x-permissions", [UserPermissions.FILE_MANAGER])
  @ApiOkResponse({ type: [FileEntity] })
  @ApiErrorResponses()
  @ApiResponse({
    status: 403,
    description: "Requires FILE_MANAGER permission and access to serverId",
  })
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
  @ApiQuery({
    name: "serverId",
    description: "Server identifier",
    required: true,
  })
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
  @RequirePermissions(UserPermissions.FILE_MANAGER)
  @CheckServerAccess("serverId")
  @ApiExtension("x-permissions", [UserPermissions.FILE_MANAGER])
  @ApiOkResponse({ type: [FileEntity] })
  @ApiErrorResponses()
  @ApiResponse({
    status: 403,
    description: "Requires FILE_MANAGER permission and access to serverId",
  })
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
  @ApiQuery({
    name: "serverId",
    description: "Server identifier",
    required: true,
  })
  @ApiQuery({
    name: "path",
    description: "Path to the file",
    required: true,
  })
  @RequirePermissions(UserPermissions.FILE_MANAGER)
  @CheckServerAccess("serverId")
  @ApiExtension("x-permissions", [UserPermissions.FILE_MANAGER])
  @ApiOkResponse({ type: FileContentResponseDto })
  @ApiErrorResponses()
  @ApiResponse({
    status: 403,
    description: "Requires FILE_MANAGER permission and access to serverId",
  })
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
  @ApiQuery({
    name: "serverId",
    description: "Server identifier",
    required: true,
  })
  @ApiQuery({
    name: "path",
    description: "Path to the file to download",
    required: true,
  })
  @Header("Content-Type", "application/octet-stream")
  @RequirePermissions(UserPermissions.FILE_MANAGER)
  @CheckServerAccess("serverId")
  @ApiExtension("x-permissions", [UserPermissions.FILE_MANAGER])
  @ApiResponse({
    status: 200,
    description: "Binary file stream (application/octet-stream)",
  })
  @ApiErrorResponses()
  @ApiResponse({
    status: 403,
    description: "Requires FILE_MANAGER permission and access to serverId",
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
  @ApiQuery({
    name: "serverId",
    description: "Server identifier",
    required: true,
  })
  @ApiBody({ type: WriteFileDto })
  @RequirePermissions(UserPermissions.FILE_MANAGER)
  @CheckServerAccess("serverId")
  @ApiExtension("x-permissions", [UserPermissions.FILE_MANAGER])
  @ApiNoContentResponse({ description: "File written successfully" })
  @ApiErrorResponses()
  @ApiResponse({
    status: 403,
    description: "Requires FILE_MANAGER permission and access to serverId",
  })
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
  @ApiQuery({
    name: "serverId",
    description: "Server identifier",
    required: true,
  })
  @ApiBody({ type: CreateDirectoryDto })
  @RequirePermissions(UserPermissions.FILE_MANAGER)
  @CheckServerAccess("serverId")
  @ApiExtension("x-permissions", [UserPermissions.FILE_MANAGER])
  @ApiCreatedResponse({ description: "Directory created successfully" })
  @ApiErrorResponses()
  @ApiResponse({
    status: 403,
    description: "Requires FILE_MANAGER permission and access to serverId",
  })
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
  @ApiQuery({
    name: "serverId",
    description: "Server identifier",
    required: true,
  })
  @ApiBody({ type: RenameFileDto })
  @RequirePermissions(UserPermissions.FILE_MANAGER)
  @CheckServerAccess("serverId")
  @ApiExtension("x-permissions", [UserPermissions.FILE_MANAGER])
  @ApiNoContentResponse({ description: "File/directory renamed successfully" })
  @ApiErrorResponses()
  @ApiResponse({
    status: 403,
    description: "Requires FILE_MANAGER permission and access to serverId",
  })
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
  @ApiQuery({
    name: "serverId",
    description: "Server identifier",
    required: true,
  })
  @ApiBody({
    description: "File path to delete",
    type: FileOperationDto,
  })
  @RequirePermissions(UserPermissions.FILE_MANAGER)
  @CheckServerAccess("serverId")
  @ApiExtension("x-permissions", [UserPermissions.FILE_MANAGER])
  @ApiNoContentResponse({ description: "File deleted successfully" })
  @ApiErrorResponses()
  @ApiResponse({
    status: 403,
    description: "Requires FILE_MANAGER permission and access to serverId",
  })
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
  @ApiQuery({
    name: "serverId",
    description: "Server identifier",
    required: true,
  })
  @ApiQuery({
    name: "path",
    description: "Directory path where to upload the file",
    required: true,
  })
  @RequirePermissions(UserPermissions.FILE_MANAGER)
  @CheckServerAccess("serverId")
  @ApiExtension("x-permissions", [UserPermissions.FILE_MANAGER])
  @ApiCreatedResponse({ description: "File uploaded successfully" })
  @ApiErrorResponses()
  @ApiResponse({
    status: 403,
    description: "Requires FILE_MANAGER permission and access to serverId",
  })
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
  @ApiQuery({
    name: "serverId",
    description: "Server identifier",
    required: true,
  })
  @ApiBody({ type: BatchPathsDto })
  @RequirePermissions(UserPermissions.FILE_MANAGER)
  @CheckServerAccess("serverId")
  @ApiExtension("x-permissions", [UserPermissions.FILE_MANAGER])
  @ApiAcceptedResponse({ type: TaskRefResponseDto })
  @ApiErrorResponses()
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
  @ApiQuery({
    name: "serverId",
    description: "Server identifier",
    required: true,
  })
  @ApiBody({ type: ExtractArchiveDto })
  @RequirePermissions(UserPermissions.FILE_MANAGER)
  @CheckServerAccess("serverId")
  @ApiExtension("x-permissions", [UserPermissions.FILE_MANAGER])
  @ApiAcceptedResponse({ type: TaskRefResponseDto })
  @ApiErrorResponses()
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
  @ApiQuery({
    name: "serverId",
    description: "Server identifier",
    required: true,
  })
  @ApiBody({ type: CreateArchiveDto })
  @RequirePermissions(UserPermissions.FILE_MANAGER)
  @CheckServerAccess("serverId")
  @ApiExtension("x-permissions", [UserPermissions.FILE_MANAGER])
  @ApiAcceptedResponse({ type: TaskRefResponseDto })
  @ApiErrorResponses()
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
  @ApiQuery({
    name: "serverId",
    description: "Server identifier",
    required: true,
  })
  @ApiBody({
    description: "Directory path to delete",
    type: FileOperationDto,
  })
  @RequirePermissions(UserPermissions.FILE_MANAGER)
  @CheckServerAccess("serverId")
  @ApiExtension("x-permissions", [UserPermissions.FILE_MANAGER])
  @ApiNoContentResponse({ description: "Directory deleted successfully" })
  @ApiErrorResponses()
  @ApiResponse({
    status: 403,
    description: "Requires FILE_MANAGER permission and access to serverId",
  })
  async deleteDirectory(
    @Query("serverId") serverId: string,
    @Body() body: FileOperationDto,
  ): Promise<void> {
    await this.fileManagerService.deleteDirectory(serverId, body.path);
  }
}
