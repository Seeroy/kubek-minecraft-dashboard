import { useModalStore } from "@/shared/stores/modal-store";

export function useModal() {
  const openModal = useModalStore((s) => s.openModal);
  const closeModal = useModalStore((s) => s.closeModal);
  const closeAllModals = useModalStore((s) => s.closeAllModals);

  return {
    openModal,
    closeModal,
    closeAllModals,
    // Convenience aliases
    open: openModal,
    close: closeModal,
    closeAll: closeAllModals,
  };
}
