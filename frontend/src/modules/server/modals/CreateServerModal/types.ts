export interface JavaVersion {
  version: string;
  label: string;
  managed: boolean;
  description?: string;
  recommended?: boolean;
  /** Whether a runtime of this major is already present on the host (managed or system) */
  installed?: boolean;
}

export interface CreateServerModalProps {
  isOpen: boolean;
  onClose: () => void;
}
