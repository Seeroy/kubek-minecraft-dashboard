import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { AccessArea } from "@shared/access/areas";
import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { TaskRefResponseDto } from "@/core/dto/task-ref-response.dto";
import { canAccessServer } from "@/core/utils/serverAccess";
import { Audit, auditNote } from "@/modules/audit-log/audit.decorator";
import { ServerAccessGuard } from "@/modules/auth/guards/server-access.guard";
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type { Backup } from "@shared/types/backup.types";
import type { IUser } from "@shared/types/user.types";
import type { Request, Response } from "express";
import { CheckServerAccess } from "../auth/decorators/check-server-access.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { BearerAuthGuard } from "../auth/guards/bearer.guard";
import { BackupCreatorService } from "./backup-creator.service";
import { BackupsService } from "./backups.service";
import { BackupStoragesService } from "./storage/backup-storages.service";
import {
  DownloadUrlDto,
  PinBackupDto,
  UploadBackupDto,
} from "./dto/backup-actions.dto";
import { BackupOperationResponseDto } from "./dto/backup-operation-response.dto";
import { BackupEntity } from "./dto/backup.entity";
import { CreateBackupDto } from "./dto/create-backup.dto";

// Handlers name the backup and its server through auditNote
const backupAudit = (action: string) =>
  Audit({ action, category: AuditCategory.SERVER, resourceType: "backup" });

const createDetails = (req: Request) => {
  const body = (req.body ?? {}) as Partial<CreateBackupDto>;
  return {
    type: body.type,
    description: body.description,
    files: body.selectedFiles?.length,
  };
};

@ApiTags("Backups")
@ApiBearerAuth()
@Controller("api/backups")
@UseGuards(BearerAuthGuard, AccessGuard, ServerAccessGuard)
@RequireAccess(AccessArea.BACKUPS, "read")
export class BackupsController {
  constructor(
    private readonly backups: BackupsService,
    private readonly creator: BackupCreatorService,
    private readonly storages: BackupStoragesService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Backups of every server the user can access" })
  @ApiOkResponse({ type: [BackupEntity] })
  @ApiErrorResponses([401, 403])
  list(@CurrentUser() user: IUser): Backup[] {
    return this.backups
      .findAll()
      .filter((b) => canAccessServer(user, b.serverId));
  }

  @Get("server/:serverId")
  @CheckServerAccess("serverId")
  @ApiOperation({ summary: "Backups of a server" })
  @ApiOkResponse({ type: [BackupEntity] })
  @ApiErrorResponses([401, 403])
  listForServer(@Param("serverId") serverId: string): Backup[] {
    return this.backups.findByServerId(serverId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a backup" })
  @ApiOkResponse({ type: BackupEntity })
  @ApiErrorResponses([401, 403, 404])
  get(@Param("id") id: string, @CurrentUser() user: IUser): Backup {
    return this.access(user, id);
  }

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @RequireAccess(AccessArea.BACKUPS, "write")
  @CheckServerAccess("serverId")
  @ApiOperation({ summary: "Create a backup" })
  @ApiAcceptedResponse({ type: BackupOperationResponseDto })
  @ApiErrorResponses([400, 401, 403, 404])
  @Audit({
    action: AuditAction.BACKUP_CREATE,
    category: AuditCategory.SERVER,
    resourceType: "backup",
    resolve: ({ req, result }) => ({
      resourceId: result?.backup?.id,
      resourceName: req.body?.name,
      details: createDetails(req),
    }),
    resolveError: ({ req }) => ({
      resourceName: req.body?.name,
      details: createDetails(req),
    }),
  })
  create(
    @Body() dto: CreateBackupDto,
    @CurrentUser() user: IUser,
  ): BackupOperationResponseDto {
    return this.creator.create(dto, user.id);
  }

  @Post(":id/restore")
  @HttpCode(HttpStatus.ACCEPTED)
  @RequireAccess(AccessArea.BACKUPS, "manage")
  @ApiOperation({ summary: "Restore a backup, the server must be stopped" })
  @ApiAcceptedResponse({ type: TaskRefResponseDto })
  @ApiErrorResponses([400, 401, 403, 404, 409])
  @backupAudit(AuditAction.BACKUP_RESTORE)
  restore(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
    @Res({ passthrough: true }) res: Response,
  ): TaskRefResponseDto {
    this.remember(res, this.access(user, id));
    return this.backups.restore(id, user.id);
  }

  @Post(":id/upload")
  @HttpCode(HttpStatus.ACCEPTED)
  @RequireAccess(AccessArea.BACKUPS, "write")
  @ApiOperation({ summary: "Upload the local archive to a remote storage" })
  @ApiAcceptedResponse({ type: TaskRefResponseDto })
  @ApiErrorResponses([400, 401, 403, 404])
  @backupAudit(AuditAction.BACKUP_UPLOAD)
  upload(
    @Param("id") id: string,
    @Body() dto: UploadBackupDto,
    @CurrentUser() user: IUser,
    @Res({ passthrough: true }) res: Response,
  ): TaskRefResponseDto {
    this.remember(res, this.access(user, id));
    auditNote(res.req, {
      details: { storage: this.storageName(dto.storageId) },
    });
    return this.backups.upload(id, dto.storageId, user.id);
  }

  @Patch(":id/pin")
  @RequireAccess(AccessArea.BACKUPS, "write")
  @ApiOperation({ summary: "Pin or unpin a backup" })
  @ApiOkResponse({ type: BackupEntity })
  @ApiErrorResponses([400, 401, 403, 404])
  @backupAudit(AuditAction.BACKUP_PIN)
  pin(
    @Param("id") id: string,
    @Body() dto: PinBackupDto,
    @CurrentUser() user: IUser,
    @Res({ passthrough: true }) res: Response,
  ): Backup {
    this.remember(res, this.access(user, id));
    auditNote(res.req, { details: { pinned: dto.pinned } });
    return this.backups.setPinned(id, dto.pinned);
  }

  @Get(":id/download")
  @ApiOperation({ summary: "Download the local archive" })
  @ApiOkResponse({ description: "Archive stream" })
  @ApiErrorResponses([400, 401, 403, 404])
  download(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
    @Res() res: Response,
  ): void {
    this.access(user, id);
    this.backups.download(id, res);
  }

  @Get(":id/download-url")
  @ApiOperation({
    summary: "Direct link to an archive kept only in a remote storage",
  })
  @ApiOkResponse({ type: DownloadUrlDto })
  @ApiErrorResponses([400, 401, 403, 404])
  downloadUrl(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
  ): DownloadUrlDto {
    this.access(user, id);
    return this.backups.downloadUrl(id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.ACCEPTED)
  @RequireAccess(AccessArea.BACKUPS, "manage")
  @ApiOperation({ summary: "Delete a backup with all its copies" })
  @ApiAcceptedResponse({ type: TaskRefResponseDto })
  @ApiErrorResponses([400, 401, 403, 404])
  @backupAudit(AuditAction.BACKUP_DELETE)
  remove(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
    @Res({ passthrough: true }) res: Response,
  ): TaskRefResponseDto {
    this.remember(res, this.access(user, id));
    return this.backups.delete(id, user.id);
  }

  // The route id is a backup, access is checked against the server it belongs to
  private access(user: IUser, id: string): Backup {
    const backup = this.backups.findById(id);
    if (!backup) throw new NotFoundException("Backup not found");
    if (!canAccessServer(user, backup.serverId))
      throw new ForbiddenException("No access to this server");
    return backup;
  }

  private remember(res: Response, backup: Backup): void {
    auditNote(res.req, {
      resourceName: backup.name,
      serverId: backup.serverId,
    });
  }

  private storageName(id: string): string {
    return this.storages.list().find((s) => s.id === id)?.name ?? id;
  }
}
