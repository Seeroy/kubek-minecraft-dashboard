import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { AccessArea } from "@shared/access/areas";
import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { getErrorMessage } from "@/core/utils/error";
import { diffChanges } from "@/modules/audit-log/audit-diff";
import { Audit, auditNote } from "@/modules/audit-log/audit.decorator";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type { BackupStorage, OrphanArchive } from "@shared/types/backup.types";
import type { Request } from "express";
import { BearerAuthGuard } from "../auth/guards/bearer.guard";
import { BackupOrphansService } from "./copies/backup-orphans.service";
import {
  BackupStorageDto,
  BackupStorageInputDto,
  DeleteOrphansDto,
  DeleteOrphansResultDto,
  OrphanArchiveDto,
} from "./dto/backup-storage.dto";
import { BackupStoragesService } from "./storage/backup-storages.service";

class StorageTestResultDto {
  ok: boolean;
  error?: string;
}

const storageAudit = (action: string) =>
  Audit({
    action,
    category: AuditCategory.SETTINGS,
    resourceType: "backup_storage",
    resolve: ({ req, result }) => ({
      resourceId: result?.id,
      resourceName: req.body?.name,
    }),
  });

const storageFields = (storage: { name: string; config: object } | null) =>
  storage && { name: storage.name, config: storage.config };

const storageChanges = (before: unknown, after: unknown) =>
  diffChanges(before, after, { secrets: ["config.secretAccessKey"] });

@ApiTags("Backup storages")
@ApiBearerAuth()
@Controller("api/backup-storages")
@UseGuards(BearerAuthGuard, AccessGuard)
export class BackupStoragesController {
  constructor(
    private readonly storages: BackupStoragesService,
    private readonly orphans: BackupOrphansService,
  ) {}

  // Backup managers pick a target for uploads, so they may see the list
  @Get()
  @RequireAccess(AccessArea.STORAGES, "read")
  @ApiOperation({ summary: "Configured remote storages, secrets masked" })
  @ApiOkResponse({ type: [BackupStorageDto] })
  @ApiErrorResponses([401, 403])
  list(): BackupStorage[] {
    return this.storages.list();
  }

  @Get("local/orphans")
  @RequireAccess(AccessArea.STORAGES, "manage")
  @ApiOperation({ summary: "Archives on the panel disk without a backup" })
  @ApiOkResponse({ type: [OrphanArchiveDto] })
  @ApiErrorResponses([401, 403])
  listOrphans(): Promise<OrphanArchive[]> {
    return this.orphans.list();
  }

  @Delete("local/orphans")
  @RequireAccess(AccessArea.STORAGES, "manage")
  @ApiOperation({
    summary: "Delete the given archives if they are still orphans",
  })
  @ApiOkResponse({ type: DeleteOrphansResultDto })
  @ApiErrorResponses([400, 401, 403])
  @Audit({
    action: AuditAction.BACKUP_ORPHANS_DELETE,
    category: AuditCategory.SETTINGS,
    resourceType: "backup_storage",
  })
  async removeOrphans(
    @Body() dto: DeleteOrphansDto,
    @Req() req: Request,
  ): Promise<DeleteOrphansResultDto> {
    const removed = await this.orphans.remove(dto.keys);
    auditNote(req, { details: { archives: dto.keys, removed } });
    return { removed };
  }

  @Post()
  @RequireAccess(AccessArea.STORAGES, "manage")
  @ApiOperation({ summary: "Add a remote storage" })
  @ApiOkResponse({ type: BackupStorageDto })
  @ApiErrorResponses([400, 401, 403])
  @storageAudit(AuditAction.BACKUP_STORAGE_SAVE)
  create(
    @Body() dto: BackupStorageInputDto,
    @Req() req: Request,
  ): BackupStorage {
    const created = this.storages.create(dto);
    const after = storageFields(this.storages.snapshot(created.id));
    auditNote(req, { changes: storageChanges(null, after) });
    return created;
  }

  @Put(":id")
  @RequireAccess(AccessArea.STORAGES, "manage")
  @ApiOperation({
    summary: "Update a storage, a blank secret keeps the stored one",
  })
  @ApiOkResponse({ type: BackupStorageDto })
  @ApiErrorResponses([400, 401, 403, 404])
  @storageAudit(AuditAction.BACKUP_STORAGE_SAVE)
  update(
    @Param("id") id: string,
    @Body() dto: BackupStorageInputDto,
    @Req() req: Request,
  ): BackupStorage {
    const before = storageFields(this.storages.snapshot(id));
    const updated = this.storages.update(id, dto);
    const after = storageFields(this.storages.snapshot(id));
    auditNote(req, { changes: storageChanges(before, after) });
    return updated;
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAccess(AccessArea.STORAGES, "manage")
  @ApiOperation({ summary: "Remove a storage that holds no copies" })
  @ApiNoContentResponse()
  @ApiErrorResponses([401, 403, 404, 409])
  @Audit({
    action: AuditAction.BACKUP_STORAGE_DELETE,
    category: AuditCategory.SETTINGS,
    resourceType: "backup_storage",
  })
  remove(@Param("id") id: string, @Req() req: Request): void {
    auditNote(req, { resourceName: this.storages.snapshot(id)?.name });
    this.storages.remove(id);
  }

  @Post("test")
  @HttpCode(HttpStatus.OK)
  @RequireAccess(AccessArea.STORAGES, "manage")
  @ApiOperation({
    summary: "Try a draft config by writing and removing a probe object",
  })
  @ApiOkResponse({ type: StorageTestResultDto })
  @ApiErrorResponses([400, 401, 403])
  test(@Body() dto: BackupStorageInputDto): Promise<StorageTestResultDto> {
    return this.check(dto);
  }

  @Post(":id/test")
  @HttpCode(HttpStatus.OK)
  @RequireAccess(AccessArea.STORAGES, "manage")
  @ApiOperation({ summary: "Try a config, the saved secret fills a blank one" })
  @ApiOkResponse({ type: StorageTestResultDto })
  @ApiErrorResponses([400, 401, 403, 404])
  testSaved(
    @Param("id") id: string,
    @Body() dto: BackupStorageInputDto,
  ): Promise<StorageTestResultDto> {
    return this.check(dto, id);
  }

  private async check(
    dto: BackupStorageInputDto,
    id?: string,
  ): Promise<StorageTestResultDto> {
    try {
      await this.storages.test(dto, id);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: getErrorMessage(err) };
    }
  }
}
