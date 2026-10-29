import type { NoModalProps } from "@/shared/types/modal-registry";

export interface JavaVersion {
  version: string;
  label: string;
  managed: boolean;
  description?: string;
  recommended?: boolean;
  /** Whether a runtime of this major is already present on the host (managed or system) */
  installed?: boolean;
  /** User-registered custom installation, selectable by its local path */
  custom?: boolean;
  path?: string;
}

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "servers/create": { props: NoModalProps; result: void };
  }
}
