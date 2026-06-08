import type { Backup as ApiBackup } from "@/api/backups";
import type {
  Backup,
  BackupFile,
  BackupFormat,
  BackupStatus,
  BackupType,
  SelectionMode,
} from "@shared/types/backup.types";

// Bridge the API BackupEntity into the enum-rich shared Backup at the data
// boundary. The string-union fields map directly onto the domain enums
export function toBackup(entity: ApiBackup): Backup {
  return {
    ...entity,
    type: entity.type as BackupType,
    status: entity.status as BackupStatus,
    format: entity.format as BackupFormat | undefined,
    selectionMode: entity.selectionMode as SelectionMode | undefined,
    selectedFiles: entity.selectedFiles as BackupFile[] | undefined,
  };
}
