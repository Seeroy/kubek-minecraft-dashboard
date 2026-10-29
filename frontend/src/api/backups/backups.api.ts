import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type {
  Backup,
  BackupJournalEntry,
  BackupOperationResponse,
  BackupPolicy,
  BackupStorage,
  BackupStorageInput,
  BackupTaskRef,
  OrphanArchive,
  RetentionPreview,
  CreateBackupRequest,
  ServerBackupPolicy,
  StorageTestResult,
} from "./backups.model";

export class BackupsApi {
  constructor(private authHttp: AuthHttpClient) {}

  getAllBackups = (): Promise<Backup[]> => this.authHttp.get<Backup[]>("backups");

  getServerBackups = (serverId: string): Promise<Backup[]> => this.authHttp.get<Backup[]>(`backups/server/${serverId}`);

  getBackup = (id: string): Promise<Backup> => this.authHttp.get<Backup>(`backups/${id}`);

  createBackup = (data: CreateBackupRequest): Promise<BackupOperationResponse> => this.authHttp.post<BackupOperationResponse>("backups", { json: data });

  restoreBackup = (id: string): Promise<BackupTaskRef> => this.authHttp.post<BackupTaskRef>(`backups/${id}/restore`);

  uploadBackup = (id: string, storageId: string): Promise<BackupTaskRef> => this.authHttp.post<BackupTaskRef>(`backups/${id}/upload`, { json: { storageId } });

  setPinned = (id: string, pinned: boolean): Promise<Backup> => this.authHttp.patch<Backup>(`backups/${id}/pin`, { json: { pinned } });

  // Backup downloads return raw bytes
  downloadBackup = (id: string): Promise<Blob> => this.authHttp.raw.get(`backups/${id}/download`).blob();

  /** Signed link for archives that only live in a remote storage */
  downloadUrl = async (id: string): Promise<string> => (await this.authHttp.get<{ url: string }>(`backups/${id}/download-url`)).url;

  deleteBackup = (id: string): Promise<BackupTaskRef> => this.authHttp.delete<BackupTaskRef>(`backups/${id}`);

  getJournal = (serverId: string, before?: { createdAt: number; id: string }): Promise<BackupJournalEntry[]> => {
    const searchParams = new URLSearchParams({ limit: "50" });
    if (before) {
      searchParams.set("before", String(before.createdAt));
      searchParams.set("beforeId", before.id);
    }
    return this.authHttp.get<BackupJournalEntry[]>(`backups/server/${serverId}/journal`, { searchParams });
  };

  getPolicy = (serverId: string): Promise<ServerBackupPolicy> => this.authHttp.get<ServerBackupPolicy>(`backups/server/${serverId}/policy`);

  /** null drops the server policy so the panel defaults apply */
  setPolicy = (serverId: string, policy: BackupPolicy | null): Promise<ServerBackupPolicy> =>
    this.authHttp.put<ServerBackupPolicy>(`backups/server/${serverId}/policy`, { json: { policy } });

  previewPolicy = (serverId: string, policy: BackupPolicy): Promise<RetentionPreview> =>
    this.authHttp.post<RetentionPreview>(`backups/server/${serverId}/policy/preview`, { json: policy });

  getDefaultPolicy = (): Promise<BackupPolicy> => this.authHttp.get<BackupPolicy>("backups/policy/defaults");

  setDefaultPolicy = (policy: BackupPolicy): Promise<BackupPolicy> => this.authHttp.put<BackupPolicy>("backups/policy/defaults", { json: policy });

  listStorages = (): Promise<BackupStorage[]> => this.authHttp.get<BackupStorage[]>("backup-storages");

  createStorage = (input: BackupStorageInput): Promise<BackupStorage> => this.authHttp.post<BackupStorage>("backup-storages", { json: input });

  updateStorage = (id: string, input: BackupStorageInput): Promise<BackupStorage> => this.authHttp.put<BackupStorage>(`backup-storages/${id}`, { json: input });

  deleteStorage = async (id: string): Promise<void> => {
    await this.authHttp.delete<void>(`backup-storages/${id}`);
  };

  listOrphans = (): Promise<OrphanArchive[]> => this.authHttp.get<OrphanArchive[]>("backup-storages/local/orphans");

  deleteOrphans = (keys: string[]): Promise<{ removed: number }> =>
    this.authHttp.delete<{ removed: number }>("backup-storages/local/orphans", { json: { keys } });

  /** Tries a draft config, a saved storage fills in its stored secret */
  testStorage = (input: BackupStorageInput, id?: string): Promise<StorageTestResult> =>
    this.authHttp.post<StorageTestResult>(id ? `backup-storages/${id}/test` : "backup-storages/test", { json: input });
}

export const backupsApi = new BackupsApi(authHttp);
