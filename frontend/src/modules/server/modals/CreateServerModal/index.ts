import { useThisModal } from "@/shared/hooks/useThisModal";
import { lazy } from "react";

export const CREATE_SERVER_MODAL_ID = "servers/create";

const CreateServerModal = lazy(() => import("./CreateServerModal").then((m) => ({ default: m.CreateServerModal })));

export function NewServerModalRegistration() {
  useThisModal({ id: CREATE_SERVER_MODAL_ID, component: CreateServerModal, module: "global" });
  return null;
}
