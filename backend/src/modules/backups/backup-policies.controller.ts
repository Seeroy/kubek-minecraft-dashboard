import { RequireAccess } from "@/modules/auth/decorators/require-access.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { AccessArea } from "@shared/access/areas";
import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { diffChanges } from "@/modules/audit-log/audit-diff";
import { Audit, auditNote } from "@/modules/audit-log/audit.decorator";
import { ServerAccessGuard } from "@/modules/auth/guards/server-access.guard";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Req,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type {
  BackupJournalEntry,
  BackupPolicy,
  RetentionPreview,
  ServerBackupPolicy,
} from "@shared/types/backup.types";
import type { Request } from "express";
import { CheckServerAccess } from "../auth/decorators/check-server-access.decorator";
import { BearerAuthGuard } from "../auth/guards/bearer.guard";
import {
  BackupJournalEntryDto,
  BackupJournalQueryDto,
} from "./dto/backup-journal.dto";
import {
  BackupPolicyDto,
  RetentionPreviewDto,
  ServerBackupPolicyDto,
  UpdateServerPolicyDto,
} from "./dto/backup-policy.dto";
import { BackupJournalService } from "./journal/backup-journal.service";
import { BackupPolicyService } from "./policy/backup-policy.service";
import { BackupStoragesService } from "./storage/backup-storages.service";
import { BackupRetentionService } from "./retention/backup-retention.service";

@ApiTags("Backups")
@ApiBearerAuth()
@Controller("api/backups")
@UseGuards(BearerAuthGuard, AccessGuard, ServerAccessGuard)
export class BackupPoliciesController {
  constructor(
    private readonly policies: BackupPolicyService,
    private readonly journal: BackupJournalService,
    private readonly retention: BackupRetentionService,
    private readonly storages: BackupStoragesService,
  ) {}

  @Get("policy/defaults")
  @RequireAccess(AccessArea.BACKUPS, "read")
  @ApiOperation({ summary: "Policy applied to servers without their own" })
  @ApiOkResponse({ type: BackupPolicyDto })
  @ApiErrorResponses([401, 403])
  getDefaults(): BackupPolicy {
    return this.policies.getDefaults();
  }

  @Put("policy/defaults")
  @RequireAccess(AccessArea.STORAGES, "manage")
  @ApiOperation({ summary: "Change the panel wide backup policy" })
  @ApiOkResponse({ type: BackupPolicyDto })
  @ApiErrorResponses([400, 401, 403])
  @Audit({
    action: AuditAction.BACKUP_POLICY_UPDATE,
    category: AuditCategory.SETTINGS,
    resourceType: "backup_policy",
  })
  setDefaults(@Body() dto: BackupPolicyDto, @Req() req: Request): BackupPolicy {
    const before = this.policies.getDefaults();
    const after = this.policies.setDefaults(dto);
    auditNote(req, { changes: this.policyChanges(before, after) });
    return after;
  }

  @Get("server/:serverId/policy")
  @RequireAccess(AccessArea.BACKUPS, "read")
  @CheckServerAccess("serverId")
  @ApiOperation({ summary: "Retention and upload policy of a server" })
  @ApiOkResponse({ type: ServerBackupPolicyDto })
  @ApiErrorResponses([401, 403])
  getForServer(@Param("serverId") serverId: string): ServerBackupPolicy {
    return this.policies.forServer(serverId);
  }

  @Put("server/:serverId/policy")
  @RequireAccess(AccessArea.BACKUPS, "manage")
  @CheckServerAccess("serverId")
  @ApiOperation({
    summary: "Set the server policy, null goes back to the defaults",
  })
  @ApiOkResponse({ type: ServerBackupPolicyDto })
  @ApiErrorResponses([400, 401, 403])
  @Audit({
    action: AuditAction.BACKUP_POLICY_UPDATE,
    category: AuditCategory.SERVER,
    resourceType: "backup_policy",
    resolve: ({ req }) => ({ resourceId: String(req.params.serverId) }),
  })
  setForServer(
    @Param("serverId") serverId: string,
    @Body() dto: UpdateServerPolicyDto,
    @Req() req: Request,
  ): ServerBackupPolicy {
    const before = this.policies.forServer(serverId);
    const after = this.policies.setForServer(serverId, dto.policy);
    auditNote(req, { changes: this.policyChanges(before, after) });
    return after;
  }

  @Post("server/:serverId/policy/preview")
  @HttpCode(200)
  @RequireAccess(AccessArea.BACKUPS, "read")
  @CheckServerAccess("serverId")
  @ApiOperation({ summary: "How many copies a draft policy would delete now" })
  @ApiOkResponse({ type: RetentionPreviewDto })
  @ApiErrorResponses([400, 401, 403])
  preview(
    @Param("serverId") serverId: string,
    @Body() dto: BackupPolicyDto,
  ): RetentionPreview {
    return this.retention.preview(serverId, dto);
  }

  @Get("server/:serverId/journal")
  @RequireAccess(AccessArea.BACKUPS, "read")
  @CheckServerAccess("serverId")
  @ApiOperation({ summary: "Backup operations of a server, newest first" })
  @ApiOkResponse({ type: [BackupJournalEntryDto] })
  @ApiErrorResponses([400, 401, 403])
  journalOf(
    @Param("serverId") serverId: string,
    @Query() query: BackupJournalQueryDto,
  ): BackupJournalEntry[] {
    return this.journal.list(serverId, {
      limit: query.limit,
      before:
        query.before !== undefined && query.beforeId
          ? { createdAt: query.before, id: query.beforeId }
          : undefined,
    });
  }

  // The storage is shown by name, an id says nothing in the log
  private policyChanges(before: BackupPolicy, after: BackupPolicy) {
    const names = new Map(this.storages.list().map((s) => [s.id, s.name]));
    const readable = (policy: BackupPolicy) => ({
      ...policy,
      remote: {
        ...policy.remote,
        storageId:
          policy.remote.storageId &&
          (names.get(policy.remote.storageId) ?? policy.remote.storageId),
      },
    });
    return diffChanges(readable(before), readable(after), {
      ignore: ["serverId"],
    });
  }
}
