import type { ComponentType } from "react";
import type { ModalId, PropsOf, ResultOf } from "./modal-registry";

export interface ModalProps<Result = void> {
  isOpen: boolean;
  // Modals without a result take no args, so onClose can go straight into onClick/onOpenChange
  onClose: [Result] extends [void] ? () => void : (result?: Result) => void;
}

export type ModalComponentProps<K extends ModalId> = ModalProps<ResultOf<K>> & PropsOf<K>;

export interface ModalConfig<K extends ModalId = ModalId> {
  id: K;
  component: ComponentType<ModalComponentProps<K>>;
  module?: string;
}
