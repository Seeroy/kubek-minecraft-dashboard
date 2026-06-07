"use client";
import { useModalStore } from "@/shared/stores/modal-store";
import { ModalConfig } from "@/shared/types/modal.types";
import { useEffect } from "react";

export function useThisModal(config: ModalConfig) {
  const { registerModal, unregisterModal } = useModalStore();

  useEffect(() => {
    registerModal(config);
    return () => unregisterModal(config.id);
  }, [config.id, registerModal, unregisterModal]);
}
