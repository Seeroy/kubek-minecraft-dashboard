"use client";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useWhatsNewTrigger } from "../lib/useWhatsNewTrigger";
import WhatsNewModal, { WHATS_NEW_MODAL_ID } from "./WhatsNewModal";

// Registers the what's-new modal and opens it once after an update
export function WhatsNewBridge() {
  useThisModal({
    id: WHATS_NEW_MODAL_ID,
    component: WhatsNewModal,
    module: "whats-new",
  });
  useWhatsNewTrigger();
  return null;
}
