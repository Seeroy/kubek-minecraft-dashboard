import { getErrorMessage } from "@/core/utils/error";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  type BackupActor,
  BackupCopyStatus,
  BackupJournalOp,
} from "@shared/types/backup.types";
import { promises as fs } from "fs";
import { join } from "path";
import { sha256File } from "../archive/backup-archiver";
import { archiveExtension, LocalBackupStore } from "../archive/local-store";
import { BackupCopiesService } from "../copies/backup-copies.service";
import {
  BackupOperations,
  type OperationContext,
} from "../journal/backup-operations";
import {
  BackupCopiesRepository,
  type StoredCopy,
} from "../repositories/backup-copies.repository";
import type { BackupRecord } from "../repositories/backups.repository";
import { RemoteStorages } from "./remote-storages.service";

export interface AcquiredArchive {
  path: string;
  release: () => Promise<void>;
}

/** Moves archives between the panel disk and remote storages */
@Injectable()
export class BackupTransferService {
  constructor(
    private readonly copiesRepo: BackupCopiesRepository,
    private readonly copies: BackupCopiesService,
    private readonly local: LocalBackupStore,
    private readonly remote: RemoteStorages,
    private readonly ops: BackupOperations,
  ) {}

  /** Throws 404 for a storage id that does not exist */
  assertStorage(storageId: string): void {
    if (!this.remote.exists(storageId)) {
      throw new NotFoundException({
        code: "STORAGE_NOT_FOUND",
        message: "Storage not found",
      });
    }
  }

  async upload(
    backup: BackupRecord,
    storageId: string,
    actor: BackupActor,
    onProgress: (fraction: number) => void,
  ): Promise<StoredCopy> {
    // Everything after the request is journaled, a missing storage included
    const ctx = this.ctx(
      backup,
      actor,
      this.remote.exists(storageId) ? storageId : null,
    );
    return this.ops.track(
      BackupJournalOp.UPLOAD,
      ctx,
      () => this.uploadCopy(backup, storageId, onProgress),
      (copy) => ({ bytes: copy.size }),
    );
  }

  private async uploadCopy(
    backup: BackupRecord,
    storageId: string,
    onProgress: (fraction: number) => void,
  ): Promise<StoredCopy> {
    this.assertStorage(storageId);
    const localCopy = this.copiesRepo.findAt(backup.id, null);
    const localPath = this.copies.localPath(backup.id);
    if (!localCopy || !localPath) {
      throw new BadRequestException(
        "The backup has no local archive to upload",
      );
    }
    const existing = this.copiesRepo.findAt(backup.id, storageId);
    if (existing?.status === BackupCopyStatus.READY) return existing;
    if (existing) this.copiesRepo.delete(existing.id);

    const objectKey = this.remote.keyFor(
      storageId,
      `${backup.serverId}/${backup.id}.${archiveExtension(backup.format)}`,
    );
    const copy = this.copiesRepo.create({
      backupId: backup.id,
      storageId,
      objectKey,
      size: 0,
      status: BackupCopyStatus.UPLOADING,
      error: null,
    });
    const release = this.copies.lease(localCopy.id);
    try {
      const total = Math.max(1, (await fs.stat(localPath)).size);
      const size = await this.remote.upload(
        storageId,
        localPath,
        objectKey,
        (b) => onProgress(b / total),
      );
      if (!this.copiesRepo.findById(copy.id)) {
        // Deleted while uploading, the object would be left behind unseen
        await this.remote.remove(storageId, objectKey);
        throw new Error("The backup was deleted during the upload");
      }
      this.copiesRepo.setStatus(copy.id, BackupCopyStatus.READY, { size });
      return { ...copy, size, status: BackupCopyStatus.READY };
    } catch (err) {
      this.copiesRepo.setStatus(copy.id, BackupCopyStatus.FAILED, {
        error: getErrorMessage(err),
      });
      throw err;
    } finally {
      release();
    }
  }

  /** A local file to read the archive from, fetched from a storage when the disk has none */
  async acquire(
    backup: BackupRecord,
    actor: BackupActor,
    onProgress: (fraction: number) => void,
  ): Promise<AcquiredArchive> {
    const localCopy = this.copiesRepo.findAt(backup.id, null);
    const localPath = this.copies.localPath(backup.id);
    if (localCopy && localPath) {
      const release = this.copies.lease(localCopy.id);
      return { path: localPath, release: () => Promise.resolve(release()) };
    }

    const copy = this.copies.readyRemote(backup.id);
    if (!copy?.storageId) {
      throw new BadRequestException(
        "No stored archive is available for this backup",
      );
    }
    const releaseLease = this.copies.lease(copy.id);
    const staging = await this.local.stagingDir("download");
    const path = join(staging, `archive.${archiveExtension(backup.format)}`);
    const release = async () => {
      releaseLease();
      await fs.rm(staging, { recursive: true, force: true });
    };
    try {
      await this.ops.track(
        BackupJournalOp.DOWNLOAD,
        this.ctx(backup, actor, copy.storageId),
        async () => {
          const bytes = await this.remote.download(
            copy.storageId!,
            copy.objectKey,
            path,
            (b) => onProgress(b / Math.max(1, copy.size)),
          );
          await this.verify(backup, path);
          return bytes;
        },
        (bytes) => ({ bytes }),
      );
    } catch (err) {
      await release();
      throw err;
    }
    return { path, release };
  }

  downloadUrl(backup: BackupRecord, fileName: string): string {
    const copy = this.copies.readyRemote(backup.id);
    if (!copy?.storageId) {
      throw new BadRequestException(
        "No stored archive is available for this backup",
      );
    }
    return this.remote.downloadUrl(copy.storageId, copy.objectKey, fileName);
  }

  // A truncated or swapped object must never be unpacked into a server
  private async verify(backup: BackupRecord, path: string): Promise<void> {
    if (!backup.checksum) return;
    if ((await sha256File(path)) !== backup.checksum) {
      throw new Error("The downloaded archive does not match its checksum");
    }
  }

  private ctx(
    backup: BackupRecord,
    actor: BackupActor,
    storageId: string | null,
  ): OperationContext {
    return {
      serverId: backup.serverId,
      backupId: backup.id,
      backupName: backup.name,
      storageId,
      actor,
    };
  }
}
