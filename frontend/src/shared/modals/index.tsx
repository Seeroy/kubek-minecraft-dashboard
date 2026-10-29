export {
  CONFIRM_MODAL_ID,
  confirmDialog,
  ConfirmModalRegistration,
  type ConfirmProps,
} from "./confirm";

import { ConfirmModalRegistration } from "./confirm";

export function SharedModalsRegistration() {
  return <ConfirmModalRegistration />;
}
