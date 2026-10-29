import { ServerLocksService } from "@/core/locks/server-locks.service";
import { getErrorMessage } from "@/core/utils/error";
import { getSafeServerPath } from "@/core/utils/serverPath";
import { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import { ServersService } from "@/modules/servers/servers.service";
import { TasksService } from "@/modules/tasks/tasks.service";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  type Backup,
  type BackupActor,
  BackupFormat,
  BackupJournalOp,
  BackupStatus,
  type BackupTrigger,
  BackupType,
  SelectionMode,
} from "@shared/types/backup.types";
import { TaskType } from "@shared/types/task.types";
import { randomUUID } from "crypto";
import { existsSync, promises as fs } from "fs";
import { packArchive, sha256File } from "./archive/backup-archiver";
import { collectBackupFiles } from "./archive/backup-files";
import { LocalBackupStore } from "./archive/local-store";
import { BackupCopiesService } from "./copies/backup-copies.service";
import type { CreateBackupDto } from "./dto/create-backup.dto";
import {
  BackupOperations,
  type OperationContext,
} from "./journal/backup-operations";
import { BackupPolicyService } from "./policy/backup-policy.service";
import {
  type BackupRecord,
  BackupsRepository,
} from "./repositories/backups.repository";
import { BackupRetentionService } from "./retention/backup-retention.service";
import { BackupTransferService } from "./storage/backup-transfer.service";
import { sanitizeBackupError } from "./backup-errors";
import { WorldSaveService } from "./world-save.service";

type Progress = (progress: number, message: string) => void;

/** Builds an archive, then hands it to upload and retention per the server policy */
@Injectable()
export class BackupCreatorService {
  private readonly logger = new Logger(BackupCreatorService.name);

  constructor(
    private readonly backups: BackupsRepository,
    private readonly copies: BackupCopiesService,
    private readonly local: LocalBackupStore,
    private readonly worldSave: WorldSaveService,
    private readonly transfer: BackupTransferService,
    private readonly retention: BackupRetentionService,
    private readonly policies: BackupPolicyService,
    private readonly ops: BackupOperations,
    private readonly tasks: TasksService,
    private readonly servers: ServersService,
    private readonly locks: ServerLocksService,
    private readonly bus: ExtensionEventBus,
  ) {}

  create(
    dto: CreateBackupDto,
    ownerId: string | undefined,
    trigger: BackupTrigger = "user",
  ): { backup: Backup; taskId: string } {
    // Known servers only, the id goes into paths
    if (
      !this.servers.findById(dto.serverId) ||
      !existsSync(getSafeServerPath(dto.serverId))
    )
      throw new NotFoundException("Server not found");
    if (dto.type === BackupType.PARTIAL && !dto.selectedFiles?.length) {
      throw new BadRequestException(
        "Selected files are required for partial backup",
      );
    }

    const now = Date.now();
    const record: BackupRecord = {
      id: randomUUID(),
      name: dto.name,
      description: dto.description,
      type: dto.type,
      status: BackupStatus.CREATING,
      createdAt: now,
      updatedAt: now,
      fileCount: 0,
      totalSize: 0,
      selectedFiles: dto.selectedFiles,
      serverId: dto.serverId,
      ownerId,
      compressionRatio: dto.compressionRatio ?? 6,
      format: dto.format ?? BackupFormat.ZIP,
      selectionMode:
        dto.type === BackupType.PARTIAL
          ? SelectionMode.CUSTOM
          : SelectionMode.ALL,
      globExceptions: dto.globExceptions ?? [],
      pinned: false,
    };
    const release = this.locks.acquire(dto.serverId, "backup");
    this.backups.create(record);
    this.bus.publish("backup.created", {
      serverId: record.serverId,
      backupId: record.id,
    });

    const serverName =
      this.servers.findById(dto.serverId)?.name ?? dto.serverId;
    const task = this.tasks.runTask(
      TaskType.BACKUP_CREATE,
      ownerId ?? "",
      (taskId) =>
        this.run(
          record,
          { trigger, userId: ownerId ?? null },
          (progress, message) =>
            this.tasks.updateTask(taskId, { progress, message }),
        ).finally(release),
      { backupId: record.id, serverId: dto.serverId, serverName },
    );
    return { backup: { ...record, copies: [] }, taskId: task.id };
  }

  private async run(
    record: BackupRecord,
    actor: BackupActor,
    progress: Progress,
  ): Promise<void> {
    const ctx: OperationContext = {
      serverId: record.serverId,
      backupId: record.id,
      backupName: record.name,
      actor,
    };
    try {
      await this.ops.track(
        BackupJournalOp.CREATE,
        ctx,
        () => this.archive(record, progress),
        (size) => ({ bytes: size }),
      );
    } catch (err) {
      this.backups.update({
        ...record,
        status: BackupStatus.FAILED,
        updatedAt: Date.now(),
      });
      this.logger.error(`Backup ${record.id} failed: ${getErrorMessage(err)}`);
      throw new BadRequestException(
        `Backup creation failed: ${sanitizeBackupError(getErrorMessage(err))}`,
      );
    }
    await this.afterCreate(record, actor, progress);
    progress(100, "Backup completed");
  }

  private async archive(
    record: BackupRecord,
    progress: Progress,
  ): Promise<number> {
    const serverPath = getSafeServerPath(record.serverId);
    const objectKey = this.local.keyFor(
      record.serverId,
      record.id,
      record.format,
    );
    const outputPath = await this.local.prepare(objectKey);
    try {
      return await this.pack(
        record,
        serverPath,
        outputPath,
        objectKey,
        progress,
      );
    } catch (err) {
      // A half written archive has no copy row, nothing else would ever remove it
      await fs.rm(outputPath, { force: true });
      throw err;
    }
  }

  private async pack(
    record: BackupRecord,
    serverPath: string,
    outputPath: string,
    objectKey: string,
    progress: Progress,
  ): Promise<number> {
    progress(5, "Preparing backup...");
    await this.worldSave.hold(record.serverId, async () => {
      const entries = await collectBackupFiles(record, serverPath);
      record.fileCount = entries.length;
      record.totalSize = entries.reduce((sum, e) => sum + e.size, 0);
      this.backups.update(record);
      progress(10, "Creating archive...");
      await packArchive(
        entries,
        serverPath,
        outputPath,
        record.format,
        (fraction) =>
          progress(Math.round(10 + fraction * 70), "Creating archive..."),
      );
    });

    progress(85, "Verifying archive...");
    const { size } = await fs.stat(outputPath);
    record.checksum = await sha256File(outputPath);
    this.copies.addLocal(record, objectKey, size);
    Object.assign(record, {
      status: BackupStatus.COMPLETED,
      updatedAt: Date.now(),
    });
    this.backups.update(record);
    return size;
  }

  // Upload and retention failures are journaled, the backup itself is already safe
  private async afterCreate(
    record: BackupRecord,
    actor: BackupActor,
    progress: Progress,
  ): Promise<void> {
    const { remote } = this.policies.forServer(record.serverId);
    if (remote.storageId && remote.uploadMode === "auto") {
      try {
        await this.transfer.upload(
          record,
          remote.storageId,
          actor,
          (fraction) =>
            progress(Math.round(88 + fraction * 10), "Uploading to storage..."),
        );
        if (remote.deleteLocalAfterUpload) await this.dropLocal(record);
      } catch (err) {
        this.logger.warn(
          `Upload of ${record.id} failed: ${getErrorMessage(err)}`,
        );
      }
    }
    await this.retention
      .apply(record.serverId, actor)
      .catch((err) =>
        this.logger.warn(
          `Retention after ${record.id} failed: ${getErrorMessage(err)}`,
        ),
      );
  }

  private async dropLocal(record: BackupRecord): Promise<void> {
    const localCopy = this.copies
      .of(record.id)
      .find((c) => c.storageId === null);
    if (localCopy) await this.copies.remove(localCopy);
  }
}
