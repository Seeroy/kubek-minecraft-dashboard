import { Injectable } from "@nestjs/common";
import {
  type Backup,
  type BackupCopy,
  BackupCopyStatus,
} from "@shared/types/backup.types";
import { existsSync } from "fs";
import { LocalBackupStore } from "../archive/local-store";
import {
  BackupCopiesRepository,
  type StoredCopy,
} from "../repositories/backup-copies.repository";
import {
  type BackupRecord,
  BackupsRepository,
} from "../repositories/backups.repository";
import { RemoteStorages } from "../storage/remote-storages.service";

/** Where the archives of a backup live and how to get rid of them */
@Injectable()
export class BackupCopiesService {
  // Copies being read right now, retention leaves them alone
  private readonly leases = new Map<string, number>();

  constructor(
    private readonly copies: BackupCopiesRepository,
    private readonly backups: BackupsRepository,
    private readonly local: LocalBackupStore,
    private readonly remote: RemoteStorages,
  ) {}

  withCopies(records: BackupRecord[]): Backup[] {
    const byBackup = new Map<string, StoredCopy[]>();
    for (const copy of this.copies.findByBackups(records.map((r) => r.id))) {
      const list = byBackup.get(copy.backupId) ?? [];
      list.push(copy);
      byBackup.set(copy.backupId, list);
    }
    return records.map((record) => ({
      ...record,
      copies: (byBackup.get(record.id) ?? []).map(toPublicCopy),
    }));
  }

  /** Marks a copy as in use until the returned function is called */
  lease(copyId: string): () => void {
    this.leases.set(copyId, (this.leases.get(copyId) ?? 0) + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const left = (this.leases.get(copyId) ?? 1) - 1;
      if (left > 0) this.leases.set(copyId, left);
      else this.leases.delete(copyId);
    };
  }

  isLeased(copyId: string): boolean {
    return this.leases.has(copyId);
  }

  of(backupId: string): StoredCopy[] {
    return this.copies.findByBackup(backupId);
  }

  addLocal(backup: BackupRecord, objectKey: string, size: number): StoredCopy {
    return this.copies.create({
      backupId: backup.id,
      storageId: null,
      objectKey,
      size,
      status: BackupCopyStatus.READY,
      error: null,
    });
  }

  /** Path of a ready local archive, null when the backup only lives remotely */
  localPath(backupId: string): string | null {
    const copy = this.copies.findAt(backupId, null);
    if (copy?.status !== BackupCopyStatus.READY) return null;
    const path = this.local.pathOf(copy.objectKey);
    return existsSync(path) ? path : null;
  }

  readyRemote(backupId: string): StoredCopy | null {
    return (
      this.of(backupId).find(
        (c) => c.storageId && c.status === BackupCopyStatus.READY,
      ) ?? null
    );
  }

  /** Deletes one archive, the backup itself goes with its last copy */
  async remove(copy: StoredCopy): Promise<{ backupGone: boolean }> {
    if (copy.storageId)
      await this.remote.remove(copy.storageId, copy.objectKey);
    else await this.local.remove(copy.objectKey);
    this.copies.delete(copy.id);
    const backupGone = this.of(copy.backupId).length === 0;
    if (backupGone) this.backups.delete(copy.backupId);
    return { backupGone };
  }

  async removeAll(backupId: string): Promise<void> {
    for (const copy of this.of(backupId)) await this.remove(copy);
    this.backups.delete(backupId);
  }
}

// The object key is a storage detail and never leaves the backend
function toPublicCopy(copy: StoredCopy): BackupCopy {
  return {
    id: copy.id,
    backupId: copy.backupId,
    storageId: copy.storageId,
    size: copy.size,
    status: copy.status,
    error: copy.error,
    createdAt: copy.createdAt,
    updatedAt: copy.updatedAt,
  };
}
