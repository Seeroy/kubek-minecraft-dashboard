import { Module } from "@nestjs/common";
import { ServerTypesModule } from "../server-types/server-types.module";
import { ServersModule } from "../servers/servers.module";
import { TasksModule } from "../tasks/tasks.module";
import { LocalBackupStore } from "./archive/local-store";
import { BackupCreatorService } from "./backup-creator.service";
import { BackupPoliciesController } from "./backup-policies.controller";
import { BackupRecoveryService } from "./backup-recovery.service";
import { BackupStoragesController } from "./backup-storages.controller";
import { BackupsController } from "./backups.controller";
import { BackupsService } from "./backups.service";
import { BackupCopiesService } from "./copies/backup-copies.service";
import { BackupOrphansService } from "./copies/backup-orphans.service";
import { BackupJournalService } from "./journal/backup-journal.service";
import { BackupOperations } from "./journal/backup-operations";
import { BackupPolicyService } from "./policy/backup-policy.service";
import { BackupCopiesRepository } from "./repositories/backup-copies.repository";
import { BackupJournalRepository } from "./repositories/backup-journal.repository";
import { BackupPoliciesRepository } from "./repositories/backup-policies.repository";
import { BackupStoragesRepository } from "./repositories/backup-storages.repository";
import { BackupsRepository } from "./repositories/backups.repository";
import { BackupRetentionService } from "./retention/backup-retention.service";
import { BackupStoragesService } from "./storage/backup-storages.service";
import { BackupTransferService } from "./storage/backup-transfer.service";
import { RemoteStorages } from "./storage/remote-storages.service";
import { WorldSaveService } from "./world-save.service";

@Module({
  imports: [TasksModule, ServersModule, ServerTypesModule],
  controllers: [
    BackupsController,
    BackupPoliciesController,
    BackupStoragesController,
  ],
  providers: [
    BackupsRepository,
    BackupCopiesRepository,
    BackupPoliciesRepository,
    BackupJournalRepository,
    BackupStoragesRepository,
    LocalBackupStore,
    RemoteStorages,
    BackupStoragesService,
    BackupTransferService,
    BackupCopiesService,
    BackupOperations,
    BackupJournalService,
    BackupPolicyService,
    BackupRetentionService,
    BackupOrphansService,
    WorldSaveService,
    BackupCreatorService,
    BackupsService,
    BackupRecoveryService,
  ],
  exports: [BackupsService, BackupCreatorService],
})
export class BackupsModule {}
