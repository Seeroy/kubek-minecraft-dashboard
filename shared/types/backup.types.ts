export enum BackupType {
  FULL = "full",
  PARTIAL = "partial",
}

export enum BackupStatus {
  CREATING = "creating",
  COMPLETED = "completed",
  FAILED = "failed",
  PAUSED = "paused",
}

export enum BackupFormat {
  ZIP = "zip",
  TAR_GZ = "tar.gz",
}

export enum SelectionMode {
  ALL = "all",
  CUSTOM = "custom",
}

export interface BackupFile {
  name: string;
  path: string;
  selected?: boolean;
  size?: number;
}

export interface Backup {
  id: string;
  name: string;
  description?: string;
  type: BackupType;
  status: BackupStatus;
  progress: number;
  createdAt: number;
  updatedAt: number;
  fileCount: number;
  totalSize: number;
  selectedFiles?: BackupFile[];
  serverId: string;
  path?: string;
  ownerId?: string;
  compressionRatio?: number;
  format?: BackupFormat;
  selectionMode?: SelectionMode;
  globExceptions?: string[];
}

export interface CreateBackupRequest {
  name: string;
  description?: string;
  type: BackupType;
  selectedFiles?: BackupFile[];
  serverId: string;
  compressionRatio?: number;
  format?: BackupFormat;
  selectionMode?: SelectionMode;
  globExceptions?: string[];
}

export interface BackupOperationResponse {
  backup?: Backup;
  taskId: string;
}
