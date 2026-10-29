import { getErrorMessage } from "@/core/utils/error";
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  type BackupActor,
  BackupCopyStatus,
  type BackupPolicy,
  BackupJournalOp,
  BackupStatus,
  type RetentionLimits,
  type RetentionPreview,
} from "@shared/types/backup.types";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { BackupCopiesService } from "../copies/backup-copies.service";
import { BackupOperations, SYSTEM_ACTOR } from "../journal/backup-operations";
import { BackupPolicyService } from "../policy/backup-policy.service";
import { BackupCopiesRepository } from "../repositories/backup-copies.repository";
import { BackupsRepository } from "../repositories/backups.repository";
import { planRetention } from "./retention.policy";

/** Applies the server policy to its local and remote copies */
@Injectable()
export class BackupRetentionService {
  private readonly logger = new Logger(BackupRetentionService.name);
  private readonly running = new Set<string>();

  constructor(
    private readonly backups: BackupsRepository,
    private readonly copiesRepo: BackupCopiesRepository,
    private readonly copies: BackupCopiesService,
    private readonly policies: BackupPolicyService,
    private readonly servers: ServersRepository,
    private readonly ops: BackupOperations,
  ) {}

  async apply(
    serverId: string,
    actor: BackupActor = SYSTEM_ACTOR,
  ): Promise<void> {
    if (this.running.has(serverId)) return;
    this.running.add(serverId);
    try {
      const policy = this.policies.forServer(serverId);
      await this.prune(serverId, null, policy.local, actor);
      if (policy.remote.storageId) {
        await this.prune(
          serverId,
          policy.remote.storageId,
          policy.remote,
          actor,
        );
      }
    } finally {
      this.running.delete(serverId);
    }
  }

  /** What a draft policy would delete if it were saved now */
  preview(serverId: string, policy: BackupPolicy): RetentionPreview {
    const { storageId } = policy.remote;
    return {
      local: this.plan(serverId, null, policy.local).length,
      remote: storageId
        ? this.plan(serverId, storageId, policy.remote).length
        : 0,
    };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async applyAll(): Promise<void> {
    for (const server of this.servers.findAll()) {
      await this.apply(server.id).catch((err) =>
        this.logger.warn(
          `Retention for ${server.id} failed: ${getErrorMessage(err)}`,
        ),
      );
    }
  }

  private async prune(
    serverId: string,
    storageId: string | null,
    limits: RetentionLimits,
    actor: BackupActor,
  ): Promise<void> {
    for (const { copy, backup } of this.plan(serverId, storageId, limits)) {
      const ctx = {
        serverId,
        backupId: backup.id,
        backupName: backup.name,
        storageId,
        actor,
      };
      await this.ops
        .track(
          BackupJournalOp.PRUNE,
          ctx,
          () => this.copies.remove(copy),
          () => ({ bytes: copy.size }),
        )
        .catch((err) =>
          this.logger.warn(
            `Could not prune ${copy.id}: ${getErrorMessage(err)}`,
          ),
        );
    }
  }

  private plan(
    serverId: string,
    storageId: string | null,
    limits: RetentionLimits,
  ) {
    const records = this.backups
      .findByServerId(serverId)
      .filter((b) => b.status === BackupStatus.COMPLETED);
    const byId = new Map(records.map((r) => [r.id, r]));
    const candidates = this.copiesRepo
      .findByBackups(records.map((r) => r.id))
      .filter(
        (c) =>
          c.storageId === storageId &&
          c.status === BackupCopyStatus.READY &&
          !this.copies.isLeased(c.id),
      )
      .map((copy) => {
        const backup = byId.get(copy.backupId)!;
        return {
          copy,
          backup,
          id: copy.id,
          createdAt: backup.createdAt,
          pinned: backup.pinned,
        };
      });
    return planRetention(candidates, limits, Date.now());
  }
}
