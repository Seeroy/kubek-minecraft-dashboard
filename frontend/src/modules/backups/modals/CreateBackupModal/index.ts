import { useThisModal } from "@/shared/hooks/useThisModal";
import { lazy } from "react";

export const CREATE_BACKUP_MODAL_ID = "backups/create";

const CreateBackupModal = lazy(() => import("./CreateBackupModal").then((m) => ({ default: m.CreateBackupModal })));

export function CreateBackupModalRegistration() {
  useThisModal({ id: CREATE_BACKUP_MODAL_ID, component: CreateBackupModal, module: "global" });
  return null;
}
