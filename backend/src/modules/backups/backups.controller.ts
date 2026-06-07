import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { TaskRefResponseDto } from "@/core/dto/task-ref-response.dto";
import { Audit } from "@/modules/audit-log/audit.decorator";
import { ServerAccessGuard } from "@/modules/auth/guards/server-access.guard";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiExtension,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";
import { UserPermissions } from "@shared/types/user.types";
import type { Request, Response } from "express";
import { CheckServerAccess } from "../auth/decorators/check-server-access.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { BearerAuthGuard } from "../auth/guards/bearer.guard";
import { PermissionsGuard } from "../auth/guards/permission.guard";
import { BackupsService } from "./backups.service";
import { BackupOperationResponseDto } from "./dto/backup-operation-response.dto";
import { BackupEntity } from "./dto/backup.entity";
import { CreateBackupDto } from "./dto/create-backup.dto";

@ApiTags("Backups")
@ApiBearerAuth()
@Controller("api/backups")
@UseGuards(BearerAuthGuard, PermissionsGuard, ServerAccessGuard)
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Get()
  @ApiOperation({ summary: "Get all backups" })
  @ApiOkResponse({ type: [BackupEntity] })
  @ApiErrorResponses()
  @RequirePermissions(UserPermissions.BACKUPS)
  @ApiExtension("x-permissions", [UserPermissions.BACKUPS])
  @ApiResponse({ status: 403, description: "Requires BACKUPS permission" })
  getAllBackups(): BackupEntity[] {
    return this.backupsService.findAll();
  }

  @Get("server/:serverId")
  @ApiOperation({ summary: "Get backups for a server" })
  @ApiParam({
    name: "serverId",
    description: "Server ID",
    example: "server-123",
  })
  @ApiOkResponse({ type: [BackupEntity] })
  @ApiErrorResponses()
  @RequirePermissions(UserPermissions.BACKUPS)
  @CheckServerAccess("serverId")
  @ApiExtension("x-permissions", [UserPermissions.BACKUPS])
  @ApiResponse({
    status: 403,
    description: "Requires BACKUPS permission and server access",
  })
  getServerBackups(@Param("serverId") serverId: string): BackupEntity[] {
    return this.backupsService.findByServerId(serverId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get backup by ID" })
  @ApiParam({ name: "id", description: "Backup ID", example: "backup-123" })
  @ApiOkResponse({ type: BackupEntity })
  @ApiErrorResponses()
  @ApiResponse({ status: 404, description: "Backup not found" })
  @RequirePermissions(UserPermissions.BACKUPS)
  @ApiExtension("x-permissions", [UserPermissions.BACKUPS])
  @ApiResponse({ status: 403, description: "Requires BACKUPS permission" })
  getBackup(@Param("id") id: string): BackupEntity | null {
    return this.backupsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Create a new backup" })
  @ApiAcceptedResponse({
    description: "Backup creation started",
    type: BackupOperationResponseDto,
  })
  @ApiErrorResponses()
  @ApiResponse({ status: 400, description: "Invalid backup data" })
  @RequirePermissions(UserPermissions.BACKUPS)
  @CheckServerAccess("serverId")
  @ApiExtension("x-permissions", [UserPermissions.BACKUPS])
  @ApiResponse({
    status: 403,
    description: "Requires BACKUPS permission and server access",
  })
  @Audit({
    action: AuditAction.BACKUP_CREATE,
    category: AuditCategory.SERVER,
    resourceType: "backup",
    resolve: ({ req, result }) => ({
      resourceId: result?.backup?.id,
      resourceName: req.body?.name,
      details: { serverId: req.body?.serverId, type: req.body?.type },
    }),
    resolveError: ({ req }) => ({
      resourceName: req.body?.name,
      details: { serverId: req.body?.serverId },
    }),
  })
  createBackup(
    @Body() dto: CreateBackupDto,
    @CurrentUser() user: IUser,
  ): Promise<BackupOperationResponseDto> {
    return this.backupsService.createBackup(dto, user.id);
  }

  @Post(":id/restore")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Restore a backup" })
  @ApiParam({ name: "id", description: "Backup ID", example: "backup-123" })
  @ApiAcceptedResponse({
    description: "Backup restoration started",
    type: TaskRefResponseDto,
  })
  @ApiErrorResponses()
  @ApiResponse({ status: 404, description: "Backup not found" })
  @RequirePermissions(UserPermissions.BACKUPS)
  @CheckServerAccess("id")
  @ApiExtension("x-permissions", [UserPermissions.BACKUPS])
  @ApiResponse({
    status: 403,
    description: "Requires BACKUPS permission and server access",
  })
  @Audit({
    action: AuditAction.BACKUP_RESTORE,
    category: AuditCategory.SERVER,
    resourceType: "backup",
    resolve: ({ req }) => ({
      resourceName: (req as Request & { auditBackupName?: string })
        .auditBackupName,
    }),
  })
  restoreBackup(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
    @Req() req: Request & { auditBackupName?: string },
  ): Promise<TaskRefResponseDto> {
    req.auditBackupName = this.backupsService.findById(id)?.name;
    return this.backupsService.restoreBackup(id, user.id);
  }

  @Get(":id/download")
  @ApiOperation({ summary: "Download backup file" })
  @ApiParam({ name: "id", description: "Backup ID", example: "backup-123" })
  @ApiResponse({
    status: 200,
    description: "Backup file download (binary archive stream)",
  })
  @ApiErrorResponses()
  @ApiResponse({
    status: 404,
    description: "Backup not found or not available",
  })
  @RequirePermissions(UserPermissions.BACKUPS)
  @CheckServerAccess("id")
  @ApiExtension("x-permissions", [UserPermissions.BACKUPS])
  @ApiResponse({
    status: 403,
    description: "Requires BACKUPS permission and server access",
  })
  async downloadBackup(
    @Param("id") id: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.backupsService.downloadBackup(id, res);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Delete a backup" })
  @ApiParam({ name: "id", description: "Backup ID", example: "backup-123" })
  @ApiAcceptedResponse({
    description: "Backup deletion started",
    type: TaskRefResponseDto,
  })
  @ApiErrorResponses()
  @ApiResponse({ status: 404, description: "Backup not found" })
  @RequirePermissions(UserPermissions.BACKUPS)
  @CheckServerAccess("id")
  @ApiExtension("x-permissions", [UserPermissions.BACKUPS])
  @ApiResponse({
    status: 403,
    description: "Requires BACKUPS permission and server access",
  })
  @Audit({
    action: AuditAction.BACKUP_DELETE,
    category: AuditCategory.SERVER,
    resourceType: "backup",
    resolve: ({ req }) => ({
      resourceName: (req as Request & { auditBackupName?: string })
        .auditBackupName,
    }),
  })
  deleteBackup(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
    @Req() req: Request & { auditBackupName?: string },
  ): Promise<TaskRefResponseDto> {
    req.auditBackupName = this.backupsService.findById(id)?.name;
    return this.backupsService.deleteBackup(id, user.id);
  }
}
