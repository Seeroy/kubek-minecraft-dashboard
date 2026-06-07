import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { CheckServerAccess } from "@/modules/auth/decorators/check-server-access.decorator";
import { RequirePermissions } from "@/modules/auth/decorators/require-permissions.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permission.guard";
import { ServerAccessGuard } from "@/modules/auth/guards/server-access.guard";
import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiExtension,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { UserPermissions } from "@shared/types/user.types";
import {
  LogFileResponseDto,
  LogSearchResultResponseDto,
} from "./dto/log-response.dto";
import { ServerLogsService } from "./server-logs.service";

@ApiTags("Server logs")
@ApiBearerAuth()
@Controller("api/server-logs")
@UseGuards(BearerAuthGuard, PermissionsGuard, ServerAccessGuard)
export class ServerLogsController {
  constructor(private readonly service: ServerLogsService) {}

  @Get(":serverId")
  @ApiOperation({ summary: "List log files in <server>/logs/" })
  @ApiParam({ name: "serverId" })
  @ApiOkResponse({ type: [LogFileResponseDto], description: "Log files" })
  @ApiErrorResponses([401, 403, 404])
  @CheckServerAccess("serverId")
  @RequirePermissions(UserPermissions.FILE_MANAGER)
  @ApiExtension("x-permissions", [UserPermissions.FILE_MANAGER])
  list(@Param("serverId") serverId: string): Promise<LogFileResponseDto[]> {
    return this.service.listFiles(serverId);
  }

  @Get(":serverId/content")
  @ApiOperation({
    summary: "Read log file content (decompressing .gz on the fly)",
  })
  @ApiQuery({ name: "file" })
  @ApiQuery({
    name: "tail",
    required: false,
    description: "Return only last N lines",
  })
  @ApiOkResponse({ type: String, description: "Raw log content" })
  @ApiErrorResponses([401, 403, 404])
  @CheckServerAccess("serverId")
  @RequirePermissions(UserPermissions.FILE_MANAGER)
  @ApiExtension("x-permissions", [UserPermissions.FILE_MANAGER])
  content(
    @Param("serverId") serverId: string,
    @Query("file") file: string,
    @Query("tail") tail?: string,
  ): Promise<string> {
    const tailN = tail ? parseInt(tail, 10) : undefined;
    return this.service.readContent(serverId, file, {
      tail: Number.isFinite(tailN!) ? tailN : undefined,
    });
  }

  @Get(":serverId/search")
  @ApiOperation({ summary: "Search inside a log file (case-insensitive)" })
  @ApiQuery({ name: "file" })
  @ApiQuery({ name: "q" })
  @ApiOkResponse({
    type: [LogSearchResultResponseDto],
    description: "Matching lines",
  })
  @ApiErrorResponses([401, 403, 404])
  @CheckServerAccess("serverId")
  @RequirePermissions(UserPermissions.FILE_MANAGER)
  @ApiExtension("x-permissions", [UserPermissions.FILE_MANAGER])
  search(
    @Param("serverId") serverId: string,
    @Query("file") file: string,
    @Query("q") q: string,
  ): Promise<LogSearchResultResponseDto[]> {
    return this.service.search(serverId, file, q);
  }
}
