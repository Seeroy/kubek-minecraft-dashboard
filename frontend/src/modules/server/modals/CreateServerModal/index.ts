import { useThisModal } from "@/shared/hooks/useThisModal";
import { CreateServerModal } from "./CreateServerModal";

export { CreateServerModal } from "./CreateServerModal";

export const CREATE_SERVER_MODAL_ID = "servers/create";

export function NewServerModalRegistration() {
  useThisModal({
    id: CREATE_SERVER_MODAL_ID,
    component: CreateServerModal,
    module: "global",
  });

  return null;
}
