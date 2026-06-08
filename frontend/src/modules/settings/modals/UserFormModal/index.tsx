import { useThisModal } from "@/shared/hooks/useThisModal";
import { ModalProps } from "@/shared/types/modal.types";
import { UserFormModal } from "./UserFormModal";

export { UserFormModal };

export const CREATE_USER_MODAL_ID = "settings/create-user";
export const EDIT_USER_MODAL_ID = "settings/edit-user";

function CreateUserModalBound(props: ModalProps) {
  return <UserFormModal {...props} mode="create" />;
}

function EditUserModalBound(props: ModalProps) {
  return <UserFormModal {...props} mode="edit" />;
}

export function UserFormModalRegistration() {
  useThisModal({
    id: CREATE_USER_MODAL_ID,
    component: CreateUserModalBound,
    module: "global",
  });
  useThisModal({
    id: EDIT_USER_MODAL_ID,
    component: EditUserModalBound,
    module: "global",
  });

  return null;
}
