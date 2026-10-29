import type { SecretHint } from "./secret.types";

export enum BackupType {
  FULL = "full",
  PARTIAL = "partial",
}

export enum BackupStatus {
  CREATING = "creating",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum BackupFormat {
  ZIP = "zip",
  TAR_GZ = "tar.gz",
}

export enum SelectionMode {
  ALL = "all",
  CUSTOM = "custom",
}

export enum BackupCopyStatus {
  UPLOADING = "uploading",
  READY = "ready",
  FAILED = "failed",
}

export interface BackupFile {
  name: string;
  path: string;
  selected?: boolean;
  size?: number;
}

/** One stored archive of a backup, on the panel disk or in a remote storage */
export interface BackupCopy {
  id: string;
  backupId: string;
  /** null for the panel disk */
  storageId: string | null;
  size: number;
  status: BackupCopyStatus;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Backup {
  id: string;
  name: string;
  description?: string;
  type: BackupType;
  status: BackupStatus;
  createdAt: number;
  updatedAt: number;
  fileCount: number;
  totalSize: number;
  selectedFiles?: BackupFile[];
  serverId: string;
  ownerId?: string;
  compressionRatio?: number;
  format: BackupFormat;
  selectionMode?: SelectionMode;
  globExceptions?: string[];
  /** Pinned backups are never removed by retention */
  pinned: boolean;
  /** sha256 of the archive */
  checksum?: string;
  copies: BackupCopy[];
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

/** Limits for one location, null means unlimited */
export interface RetentionLimits {
  keepCount: number | null;
  keepDays: number | null;
}

export type BackupUploadMode = "auto" | "manual";

export interface BackupPolicy {
  local: RetentionLimits;
  remote: RetentionLimits & {
    storageId: string | null;
    uploadMode: BackupUploadMode;
    /** Drop the local copy once the remote one is ready */
    deleteLocalAfterUpload: boolean;
  };
}

/** Archive on the panel disk that no backup points to */
export interface OrphanArchive {
  key: string;
  size: number;
  modifiedAt: number;
}

/** Copies a policy would delete right now, per location */
export interface RetentionPreview {
  local: number;
  remote: number;
}

export interface ServerBackupPolicy extends BackupPolicy {
  serverId: string;
  /** False while the panel defaults apply */
  custom: boolean;
}

export enum BackupJournalOp {
  CREATE = "create",
  UPLOAD = "upload",
  DOWNLOAD = "download",
  RESTORE = "restore",
  DELETE = "delete",
  PRUNE = "prune",
  RECOVER = "recover",
}

export interface BackupJournalEntry {
  id: string;
  serverId: string;
  backupId: string | null;
  backupName: string | null;
  storageId: string | null;
  op: BackupJournalOp;
  status: "success" | "failed";
  message: string | null;
  bytes: number | null;
  durationMs: number | null;
  trigger: BackupTrigger;
  /** Who started it, also set for scheduled runs (the task owner) */
  userId: string | null;
  /** Current name of that user, joined on read */
  username: string | null;
  createdAt: number;
}

export type BackupTrigger = "user" | "scheduler" | "system";

export interface BackupActor {
  trigger: BackupTrigger;
  userId: string | null;
}

export type BackupStorageDriverKind = "s3";

export interface S3StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  prefix: string;
  accessKeyId: string;
  secretAccessKey: string;
  virtualHostedStyle: boolean;
}

/** S3 settings as returned by the API, the secret key is never sent back */
export type S3StorageConfigView = Omit<S3StorageConfig, "secretAccessKey"> & {
  secretAccessKey: SecretHint;
};

export interface BackupStorage {
  id: string;
  name: string;
  driver: BackupStorageDriverKind;
  config: S3StorageConfigView;
  createdAt: number;
  updatedAt: number;
}
