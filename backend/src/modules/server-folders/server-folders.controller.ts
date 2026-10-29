import {
  RequireAccess,
  RequireServerView,
} from "@/modules/auth/decorators/require-access.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { AccessArea } from "@shared/access/areas";
import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
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
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

@ApiTags("Server folders")
@ApiBearerAuth()
@Controller("api/server-folders")
@UseGuards(BearerAuthGuard, AccessGuard)
export class ServerFoldersController {
  constructor(private readonly service: ServerFoldersService) {}

  @Get()
  @ApiOperation({ summary: "List folders" })
  @ApiOkResponse({ type: [ServerFolderEntity], description: "List of folders" })
  @ApiErrorResponses([401, 403])
  @RequireServerView()
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
  @RequireAccess(AccessArea.SERVERS, "manage")
  create(@Body() body: CreateFolderDto): ServerFolderEntity {
    return this.service.create(body);
  }

  @Patch(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update folder" })
  @ApiOkResponse({ type: ServerFolderEntity, description: "Updated folder" })
  @ApiErrorResponses([400, 401, 403, 404])
  @RequireAccess(AccessArea.SERVERS, "manage")
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
  @RequireAccess(AccessArea.SERVERS, "manage")
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
  @RequireAccess(AccessArea.SERVERS, "manage")
  move(@Body() body: MoveServersDto): FolderMoveResponseDto {
    return this.service.move(body.serverIds, body.folderId ?? null);
  }
}
