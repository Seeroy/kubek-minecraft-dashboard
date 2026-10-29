import { Injectable } from "@nestjs/common";
import type {
  BackupPolicy,
  BackupUploadMode,
} from "@shared/types/backup.types";
import { SqliteProvider } from "../../database/sqlite.provider";

@Injectable()
export class BackupPoliciesRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  find(serverId: string): BackupPolicy | null {
    const row = this.sqlite.connection
      .query("SELECT * FROM backup_policies WHERE serverId = ?")
      .get(serverId) as any;
    if (!row) return null;
    return {
      local: { keepCount: row.localKeepCount, keepDays: row.localKeepDays },
      remote: {
        storageId: row.storageId ?? null,
        keepCount: row.remoteKeepCount,
        keepDays: row.remoteKeepDays,
        uploadMode: row.uploadMode as BackupUploadMode,
        deleteLocalAfterUpload: !!row.deleteLocalAfterUpload,
      },
    };
  }

  upsert(serverId: string, policy: BackupPolicy): void {
    this.sqlite.connection
      .prepare(
        `INSERT INTO backup_policies
        (serverId, localKeepCount, localKeepDays, storageId, remoteKeepCount, remoteKeepDays, uploadMode, deleteLocalAfterUpload)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(serverId) DO UPDATE SET
          localKeepCount = excluded.localKeepCount, localKeepDays = excluded.localKeepDays,
          storageId = excluded.storageId, remoteKeepCount = excluded.remoteKeepCount,
          remoteKeepDays = excluded.remoteKeepDays, uploadMode = excluded.uploadMode,
          deleteLocalAfterUpload = excluded.deleteLocalAfterUpload`,
      )
      .run(
        serverId,
        policy.local.keepCount,
        policy.local.keepDays,
        policy.remote.storageId,
        policy.remote.keepCount,
        policy.remote.keepDays,
        policy.remote.uploadMode,
        policy.remote.deleteLocalAfterUpload ? 1 : 0,
      );
  }

  delete(serverId: string): void {
    this.sqlite.connection
      .prepare("DELETE FROM backup_policies WHERE serverId = ?")
      .run(serverId);
  }
}
