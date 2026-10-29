import type { components } from "../types";

export type { Backup, BackupJournalEntry, BackupPolicy, BackupStorage, OrphanArchive, RetentionPreview, ServerBackupPolicy } from "@shared/types/backup.types";
export type BackupOperationResponse = components["schemas"]["BackupOperationResponseDto"];
export type BackupTaskRef = components["schemas"]["TaskRefResponseDto"];
export type CreateBackupRequest = components["schemas"]["CreateBackupDto"];
export type BackupStorageInput = components["schemas"]["BackupStorageInputDto"];
export type StorageTestResult = { ok: boolean; error?: string };
