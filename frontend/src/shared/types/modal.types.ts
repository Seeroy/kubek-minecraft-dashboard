export interface ModalProps<Result = any> {
  isOpen: boolean;
  // Flexible signature: existing modals call onClose() with no args; new modals
  // may pass a result value to resolve the open() promise. Loose typing here
  // lets callers wire onClose directly into onClick/onOpenChange handlers
  onClose: (...args: any[]) => void;

  [key: string]: any;
}

export type ModalComponent<Result = any> = React.ComponentType<
  ModalProps<Result>
>;

export interface ModalConfig {
  id: string;
  // Registered modals carry their own extra props on top of ModalProps, so the
  // registry stores them with an open component type
  component: React.ComponentType<any>;
  module?: string;
}

export type ModalType = "global" | "module";
