import {
  BackupCopyStatus,
  BackupFormat,
  BackupJournalOp,
  BackupStatus,
  BackupType,
  type Backup,
  type BackupJournalEntry,
  type BackupPolicy,
  type BackupStorage,
  type ServerBackupPolicy,
} from "@shared/types/backup.types";
import { FileType, type IFile } from "@shared/types/file.types";

const sample = (i: number, name: string, type: BackupType): Backup => ({
  id: `sample-${i}`,
  name,
  description: "Before plugin update",
  type,
  status: BackupStatus.COMPLETED,
  createdAt: 1_760_000_000_000,
  updatedAt: 0,
  fileCount: 1240,
  totalSize: 512_000_000,
  serverId: "sample",
  format: BackupFormat.ZIP,
  pinned: false,
  copies: [
    {
      id: `sample-copy-${i}`,
      backupId: `sample-${i}`,
      storageId: null,
      size: 0,
      status: BackupCopyStatus.READY,
      error: null,
      createdAt: 0,
      updatedAt: 0,
    },
  ],
});

export const SAMPLE_BACKUPS: Backup[] = [
  sample(1, "Daily backup world", BackupType.FULL),
  sample(2, "Before 1.21 update", BackupType.FULL),
  sample(3, "Plugins config", BackupType.PARTIAL),
  sample(4, "Weekly full backup", BackupType.FULL),
];

const entry = (i: number, op: BackupJournalOp, backupName: string): BackupJournalEntry => ({
  id: `sample-journal-${i}`,
  serverId: "sample",
  backupId: `sample-${i}`,
  backupName,
  storageId: null,
  op,
  status: "success",
  message: null,
  bytes: 512_000_000,
  durationMs: 4200,
  trigger: "user",
  userId: null,
  username: "administrator",
  createdAt: 0,
});

export const SAMPLE_JOURNAL: BackupJournalEntry[] = [
  entry(1, BackupJournalOp.CREATE, "Daily backup world"),
  entry(2, BackupJournalOp.UPLOAD, "Daily backup world"),
  entry(3, BackupJournalOp.RESTORE, "Before 1.21 update"),
  entry(4, BackupJournalOp.PRUNE, "Weekly full backup"),
  entry(5, BackupJournalOp.CREATE, "Plugins config"),
];

export const SAMPLE_SERVER_POLICY: ServerBackupPolicy = {
  serverId: "sample",
  custom: false,
  local: { keepCount: 10, keepDays: 30 },
  remote: { keepCount: 20, keepDays: 90, storageId: null, uploadMode: "auto", deleteLocalAfterUpload: false },
};

export const SAMPLE_DEFAULT_POLICY: BackupPolicy = { local: SAMPLE_SERVER_POLICY.local, remote: SAMPLE_SERVER_POLICY.remote };

const storage = (i: number, name: string, bucket: string): BackupStorage => ({
  id: `sample-storage-${i}`,
  name,
  driver: "s3",
  config: {
    endpoint: "https://s3.example-cloud.com",
    region: "eu-central-1",
    bucket,
    prefix: "kubek/backups",
    accessKeyId: "sample-key",
    secretAccessKey: { set: true, hint: null },
    virtualHostedStyle: false,
  },
  createdAt: 0,
  updatedAt: 0,
});

export const SAMPLE_STORAGES: BackupStorage[] = [storage(1, "Main S3 bucket", "minecraft-backups"), storage(2, "Offsite archive", "cold-storage")];

const file = (name: string, type: FileType, size = 0): IFile => ({ name, path: name, type, size, modify: new Date(0) });

export const SAMPLE_SCAN_FILES: IFile[] = [
  file("world", FileType.DIRECTORY),
  file("plugins", FileType.DIRECTORY),
  file("config", FileType.DIRECTORY),
  file("server.properties", FileType.FILE, 1400),
  file("paper.jar", FileType.FILE, 48_000_000),
];
