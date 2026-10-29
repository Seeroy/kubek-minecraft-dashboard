import { ServerLocksService } from "@/core/locks/server-locks.service";
import { getErrorMessage } from "@/core/utils/error";
import { getSafeServerPath } from "@/core/utils/serverPath";
import { ServersService } from "@/modules/servers/servers.service";
import { TasksService } from "@/modules/tasks/tasks.service";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  type Backup,
  type BackupActor,
  BackupCopyStatus,
  BackupFormat,
  BackupJournalOp,
  BackupStatus,
} from "@shared/types/backup.types";
import { ServerStatus } from "@shared/types/server/server.types";
import { TaskType } from "@shared/types/task.types";
import { Response } from "express";
import { createReadStream, promises as fs } from "fs";
import { restoreInto } from "./archive/backup-restorer";
import { archiveExtension, LocalBackupStore } from "./archive/local-store";
import { sanitizeBackupError } from "./backup-errors";
import { BackupCopiesService } from "./copies/backup-copies.service";
import { BackupOperations, userActor } from "./journal/backup-operations";
import {
  type BackupRecord,
  BackupsRepository,
} from "./repositories/backups.repository";
import { BackupRetentionService } from "./retention/backup-retention.service";
import { BackupTransferService } from "./storage/backup-transfer.service";

const RESTORABLE_STATUSES: string[] = [
  ServerStatus.STOPPED,
  ServerStatus.CRASHED,
];

@Injectable()
export class BackupsService {
  constructor(
    private readonly backups: BackupsRepository,
    private readonly copies: BackupCopiesService,
    private readonly local: LocalBackupStore,
    private readonly transfer: BackupTransferService,
    private readonly retention: BackupRetentionService,
    private readonly ops: BackupOperations,
    private readonly tasks: TasksService,
    private readonly servers: ServersService,
    private readonly locks: ServerLocksService,
  ) {}

  findAll(): Backup[] {
    return this.copies.withCopies(this.backups.findAll());
  }

  findByServerId(serverId: string): Backup[] {
    return this.copies.withCopies(this.backups.findByServerId(serverId));
  }

  findById(id: string): Backup | null {
    const record = this.backups.findById(id);
    return record ? this.copies.withCopies([record])[0] : null;
  }

  setPinned(id: string, pinned: boolean): Backup {
    this.require(id);
    this.backups.setPinned(id, pinned);
    return this.findById(id)!;
  }

  restore(id: string, ownerId?: string): { taskId: string } {
    const record = this.requireCompleted(id);
    const status = this.servers.findById(record.serverId)?.status;
    if (!status || !RESTORABLE_STATUSES.includes(status)) {
      throw new ConflictException({
        code: "SERVER_RUNNING",
        message: "Stop the server before restoring a backup",
      });
    }
    const actor = userActor(ownerId);
    const release = this.locks.acquire(record.serverId, "restore");
    return this.runTask(
      TaskType.BACKUP_RESTORE,
      record,
      ownerId,
      async (progress) => {
        await this.ops.track(
          BackupJournalOp.RESTORE,
          this.ctx(record, actor),
          async () => {
            const archive = await this.transfer.acquire(record, actor, (f) =>
              progress(Math.round(5 + f * 15), "Downloading archive..."),
            );
            const staging = await this.local.stagingDir("restore");
            try {
              await restoreInto(
                archive.path,
                staging,
                getSafeServerPath(record.serverId),
                record,
                (step) =>
                  progress(
                    RESTORE_STEPS[step].progress,
                    RESTORE_STEPS[step].message,
                  ),
              );
            } finally {
              await fs.rm(staging, { recursive: true, force: true });
              await archive.release();
            }
          },
        );
        progress(100, "Restoration completed");
      },
      release,
    );
  }

  delete(id: string, ownerId?: string): { taskId: string } {
    const record = this.require(id);
    if (record.status === BackupStatus.CREATING)
      throw new BadRequestException("The backup is still being created");
    // The upload would recreate the object right after it is deleted
    if (
      this.copies.of(id).some((c) => c.status === BackupCopyStatus.UPLOADING)
    ) {
      throw new ConflictException({
        code: "BACKUP_UPLOADING",
        message: "Wait until the upload finishes",
      });
    }
    return this.runTask(
      TaskType.BACKUP_DELETE,
      record,
      ownerId,
      async (progress) => {
        progress(50, "Deleting backup files...");
        await this.ops.track(
          BackupJournalOp.DELETE,
          this.ctx(record, userActor(ownerId)),
          () => this.copies.removeAll(id),
        );
        progress(100, "Backup deleted");
      },
    );
  }

  upload(id: string, storageId: string, ownerId?: string): { taskId: string } {
    const record = this.requireCompleted(id);
    this.transfer.assertStorage(storageId);
    return this.runTask(
      TaskType.BACKUP_UPLOAD,
      record,
      ownerId,
      async (progress) => {
        await this.transfer.upload(record, storageId, userActor(ownerId), (f) =>
          progress(Math.round(f * 99), "Uploading to storage..."),
        );
        await this.retention.apply(record.serverId, userActor(ownerId));
        progress(100, "Upload completed");
      },
    );
  }

  /** Streams the local archive, remote only backups get a direct link instead */
  download(id: string, res: Response): void {
    const record = this.requireCompleted(id);
    const path = this.copies.localPath(id);
    if (!path)
      throw new NotFoundException({
        code: "BACKUP_REMOTE_ONLY",
        message: "The archive is only in a remote storage",
      });
    res.setHeader(
      "Content-Type",
      record.format === BackupFormat.TAR_GZ
        ? "application/gzip"
        : "application/zip",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(this.fileName(record))}"`,
    );
    createReadStream(path).pipe(res);
  }

  downloadUrl(id: string): { url: string } {
    const record = this.requireCompleted(id);
    return { url: this.transfer.downloadUrl(record, this.fileName(record)) };
  }

  private runTask(
    type: TaskType,
    record: BackupRecord,
    ownerId: string | undefined,
    work: (
      progress: (progress: number, message: string) => void,
    ) => Promise<void>,
    release: () => void = () => {},
  ): { taskId: string } {
    const serverName =
      this.servers.findById(record.serverId)?.name ?? record.serverId;
    const task = this.tasks.runTask(
      type,
      ownerId ?? "",
      async (taskId) => {
        try {
          await work((progress, message) =>
            this.tasks.updateTask(taskId, { progress, message }),
          );
        } catch (err) {
          throw new BadRequestException(
            sanitizeBackupError(getErrorMessage(err)),
          );
        } finally {
          release();
        }
      },
      { backupId: record.id, serverId: record.serverId, serverName },
    );
    return { taskId: task.id };
  }

  private ctx(record: BackupRecord, actor: BackupActor) {
    return {
      serverId: record.serverId,
      backupId: record.id,
      backupName: record.name,
      actor,
    };
  }

  private fileName(record: BackupRecord): string {
    return `${record.name}.${archiveExtension(record.format)}`;
  }

  private require(id: string): BackupRecord {
    const record = this.backups.findById(id);
    if (!record) throw new NotFoundException("Backup not found");
    return record;
  }

  private requireCompleted(id: string): BackupRecord {
    const record = this.require(id);
    if (record.status !== BackupStatus.COMPLETED)
      throw new BadRequestException("Backup is not ready");
    return record;
  }
}

const RESTORE_STEPS = {
  extract: { progress: 25, message: "Extracting archive..." },
  clear: { progress: 80, message: "Clearing server files..." },
  copy: { progress: 90, message: "Restoring files..." },
} as const;
