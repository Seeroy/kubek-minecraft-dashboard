import { useThisModal } from "@/shared/hooks/useThisModal";
import { BackupInfoModal } from "./ui/BackupInfoModal";

export { BackupInfoModal } from "./ui/BackupInfoModal";
export type { BackupInfoModalProps } from "./ui/BackupInfoModal";

// Modal ID
export const BACKUP_INFO_MODAL_ID = "backups/info";

// Modal register component
export function BackupInfoModalRegistration() {
  useThisModal({
    id: BACKUP_INFO_MODAL_ID,
    component: BackupInfoModal,
    module: "global",
  });

  return null;
}
