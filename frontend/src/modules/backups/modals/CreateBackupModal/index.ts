import { useThisModal } from "@/shared/hooks/useThisModal";
import { CreateBackupModal } from "./ui/CreateBackupModal";

export type { CreateBackupFormData, CreateBackupModalProps } from "./types";
export { CreateBackupModal } from "./ui/CreateBackupModal";

// Modal ID
export const CREATE_BACKUP_MODAL_ID = "backups/create";

// Modal register component
export function CreateBackupModalRegistration() {
  useThisModal({
    id: CREATE_BACKUP_MODAL_ID,
    component: CreateBackupModal,
    module: "global",
  });

  return null;
}
