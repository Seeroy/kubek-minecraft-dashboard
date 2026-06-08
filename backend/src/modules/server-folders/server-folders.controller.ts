import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { RequirePermissions } from "@/modules/auth/decorators/require-permissions.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permission.guard";
import { CreateFolderDto } from "@/modules/server-folders/dto/create-folder.dto";
import { FolderMoveResponseDto } from "@/modules/server-folders/dto/folder-mutation-response.dto";
import { MoveServersDto } from "@/modules/server-folders/dto/move-servers.dto";
import { ServerFolderEntity } from "@/modules/server-folders/dto/server-folder.entity";
import { UpdateFolderDto } from "@/modules/server-folders/dto/update-folder.dto";
import { ServerFoldersService } from "@/modules/server-folders/server-folders.service";
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
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExtension,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { UserPermissions } from "@shared/types/user.types";

@ApiTags("Server folders")
@ApiBearerAuth()
@Controller("api/server-folders")
@UseGuards(BearerAuthGuard, PermissionsGuard)
export class ServerFoldersController {
  constructor(private readonly service: ServerFoldersService) {}

  @Get()
  @ApiOperation({ summary: "List folders" })
  @ApiOkResponse({ type: [ServerFolderEntity], description: "List of folders" })
  @ApiErrorResponses([401, 403])
  @RequirePermissions(UserPermissions.SERVERS_VIEW)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_VIEW])
  list(): ServerFolderEntity[] {
    return this.service.list();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create folder" })
  @ApiCreatedResponse({
    type: ServerFolderEntity,
    description: "Created folder",
  })
  @ApiErrorResponses([400, 401, 403])
  @RequirePermissions(UserPermissions.SERVERS_CONFIGURE)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_CONFIGURE])
  create(@Body() body: CreateFolderDto): ServerFolderEntity {
    return this.service.create(body);
  }

  @Patch(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update folder" })
  @ApiOkResponse({ type: ServerFolderEntity, description: "Updated folder" })
  @ApiErrorResponses([400, 401, 403, 404])
  @RequirePermissions(UserPermissions.SERVERS_CONFIGURE)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_CONFIGURE])
  update(
    @Param("id") id: string,
    @Body() body: UpdateFolderDto,
  ): ServerFolderEntity {
    return this.service.update(id, body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete folder (servers stay, folderId set to null)",
  })
  @ApiNoContentResponse({ description: "Folder deleted" })
  @ApiErrorResponses([401, 403, 404])
  @RequirePermissions(UserPermissions.SERVERS_CONFIGURE)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_CONFIGURE])
  remove(@Param("id") id: string): void {
    this.service.delete(id);
  }

  @Post("move")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Bulk move servers into a folder (or out of any folder)",
  })
  @ApiOkResponse({ type: FolderMoveResponseDto, description: "Move summary" })
  @ApiErrorResponses([400, 401, 403, 404])
  @RequirePermissions(UserPermissions.SERVERS_CONFIGURE)
  @ApiExtension("x-permissions", [UserPermissions.SERVERS_CONFIGURE])
  move(@Body() body: MoveServersDto): FolderMoveResponseDto {
    return this.service.move(body.serverIds, body.folderId ?? null);
  }
}
