import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type {
  Backup,
  BackupOperationResponse,
  BackupTaskRef,
  CreateBackupRequest,
} from "./backups.model";

export class BackupsApi {
  constructor(private authHttp: AuthHttpClient) {}

  getAllBackups = (): Promise<Backup[]> =>
    this.authHttp.get<Backup[]>("backups");

  getServerBackups = (serverId: string): Promise<Backup[]> =>
    this.authHttp.get<Backup[]>(`backups/server/${serverId}`);

  getBackup = (id: string): Promise<Backup> =>
    this.authHttp.get<Backup>(`backups/${id}`);

  createBackup = (
    data: CreateBackupRequest
  ): Promise<BackupOperationResponse> =>
    this.authHttp.post<BackupOperationResponse>("backups", { json: data });

  restoreBackup = (id: string): Promise<BackupTaskRef> =>
    this.authHttp.post<BackupTaskRef>(`backups/${id}/restore`);

  // Backup downloads return raw bytes
  downloadBackup = (id: string): Promise<Blob> =>
    this.authHttp.raw.get(`backups/${id}/download`).blob();

  deleteBackup = (id: string): Promise<BackupTaskRef> =>
    this.authHttp.delete<BackupTaskRef>(`backups/${id}`);
}

export const backupsApi = new BackupsApi(authHttp);
