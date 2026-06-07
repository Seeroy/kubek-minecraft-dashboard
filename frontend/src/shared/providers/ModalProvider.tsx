"use client";
import { useModalStore } from "@/shared/stores/modal-store";
import { useMemo } from "react";

export function ModalProvider() {
  const modals = useModalStore((s) => s.modals);
  const activeModals = useModalStore((s) => s.activeModals);

  // Sort by open order so the latest opened modal renders last in the DOM
  const sorted = useMemo(
    () => Array.from(activeModals.values()).sort((a, b) => a.order - b.order),
    [activeModals]
  );

  return (
    <>
      {sorted.map((active) => {
        const modalConfig = modals.get(active.id);
        if (!modalConfig) return null;

        const ModalComponent = modalConfig.component;
        return <ModalComponent key={active.id} {...active.props} />;
      })}
    </>
  );
}
