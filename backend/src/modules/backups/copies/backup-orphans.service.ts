import { Injectable } from "@nestjs/common";
import { BackupStatus, type OrphanArchive } from "@shared/types/backup.types";
import { LocalBackupStore } from "../archive/local-store";
import { BackupCopiesRepository } from "../repositories/backup-copies.repository";
import { BackupsRepository } from "../repositories/backups.repository";

/** Archives left on disk without a backup record, removed only on request */
@Injectable()
export class BackupOrphansService {
  constructor(
    private readonly copies: BackupCopiesRepository,
    private readonly backups: BackupsRepository,
    private readonly local: LocalBackupStore,
  ) {}

  async list(): Promise<OrphanArchive[]> {
    const known = new Set(this.copies.localKeys());
    // An archive being written has no copy row yet
    for (const b of this.backups.findByStatus(BackupStatus.CREATING)) {
      known.add(this.local.keyFor(b.serverId, b.id, b.format));
    }
    return (await this.local.listArchives()).filter((a) => !known.has(a.key));
  }

  /** Keys that got a record since the list was shown are kept */
  async remove(keys: string[]): Promise<number> {
    const orphans = new Set((await this.list()).map((a) => a.key));
    const doomed = keys.filter((key) => orphans.has(key));
    for (const key of doomed) await this.local.remove(key);
    return doomed.length;
  }
}
