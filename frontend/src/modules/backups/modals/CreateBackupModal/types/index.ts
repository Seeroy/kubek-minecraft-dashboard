import { ModalProps } from "@/shared/types/modal.types";

export interface CreateBackupModalProps extends ModalProps {
  serverId?: string;
}

export interface CreateBackupFormData {
  name: string;
  description?: string;
  type: "full" | "partial";
  compressionRatio: number;
  format: "zip" | "tar.gz";
  selectionMode: "all" | "custom";
  selectedFiles?: string[];
  globExceptions?: string[];
}
