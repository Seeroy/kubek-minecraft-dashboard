import { AppEventsService } from "@/core/events/app-events.service";
import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import {
  BackupCopyStatus,
  BackupJournalOp,
  BackupStatus,
} from "@shared/types/backup.types";
import { LocalBackupStore } from "./archive/local-store";
import { BackupOrphansService } from "./copies/backup-orphans.service";
import { BackupOperations, SYSTEM_ACTOR } from "./journal/backup-operations";
import { BackupCopiesRepository } from "./repositories/backup-copies.repository";
import { BackupsRepository } from "./repositories/backups.repository";

/** Cleans up after a crash or restart that interrupted backup work */
@Injectable()
export class BackupRecoveryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BackupRecoveryService.name);

  constructor(
    private readonly backups: BackupsRepository,
    private readonly copies: BackupCopiesRepository,
    private readonly local: LocalBackupStore,
    private readonly ops: BackupOperations,
    private readonly events: AppEventsService,
    private readonly orphans: BackupOrphansService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.local.init();
    this.events.on("server.deleted", ({ serverId }) =>
      this.local.removeServer(serverId),
    );

    const startedAt = Date.now();
    for (const backup of this.backups.findByStatus(BackupStatus.CREATING)) {
      this.backups.update({
        ...backup,
        status: BackupStatus.FAILED,
        updatedAt: startedAt,
      });
      await this.local.remove(
        this.local.keyFor(backup.serverId, backup.id, backup.format),
      );
      this.ops.report(
        BackupJournalOp.RECOVER,
        {
          serverId: backup.serverId,
          backupId: backup.id,
          backupName: backup.name,
          actor: SYSTEM_ACTOR,
        },
        "failed",
        startedAt,
        { message: "Interrupted by a panel restart" },
      );
    }
    for (const copy of this.copies.findByStatus(BackupCopyStatus.UPLOADING)) {
      this.copies.setStatus(copy.id, BackupCopyStatus.FAILED, {
        error: "Interrupted by a panel restart",
      });
    }
    const stale = await this.local.removeStaleStaging();
    if (stale > 0)
      this.logger.log(`Removed ${stale} leftover backup staging folders`);
    const orphans = await this.orphans.list();
    if (orphans.length > 0) {
      this.logger.warn(
        `${orphans.length} archives in ./backups have no backup record, see Settings > Storages`,
      );
    }
  }
}
