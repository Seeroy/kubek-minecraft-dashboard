"use client";
import { useModalStore } from "@/shared/stores/modal-store";
import type { ModalId } from "@/shared/types/modal-registry";
import type { ModalConfig } from "@/shared/types/modal.types";
import { useEffect } from "react";

export function useThisModal<K extends ModalId>(config: ModalConfig<K>) {
  const registerModal = useModalStore((s) => s.registerModal);
  const unregisterModal = useModalStore((s) => s.unregisterModal);

  useEffect(() => {
    registerModal(config);
    return () => unregisterModal(config.id);
  }, [config.id, registerModal, unregisterModal]);
}
