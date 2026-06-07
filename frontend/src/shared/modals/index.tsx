export {
  CONFIRM_MODAL_ID,
  confirmDialog,
  ConfirmModalRegistration,
  type ConfirmProps,
} from "./confirm";

export {
  PROMPT_MODAL_ID,
  promptDialog,
  PromptModalRegistration,
  type PromptProps,
} from "./prompt";

export {
  ALERT_MODAL_ID,
  alertDialog,
  AlertModalRegistration,
  type AlertProps,
  type AlertVariant,
} from "./alert";

export {
  CONFIRM_WITH_PASSWORD_MODAL_ID,
  confirmWithPasswordDialog,
  ConfirmWithPasswordModalRegistration,
  type ConfirmWithPasswordProps,
  type ConfirmWithPasswordResult,
} from "./confirm-with-password";

import { AlertModalRegistration } from "./alert";
import { ConfirmModalRegistration } from "./confirm";
import { ConfirmWithPasswordModalRegistration } from "./confirm-with-password";
import { PromptModalRegistration } from "./prompt";

export function SharedModalsRegistration() {
  return (
    <>
      <ConfirmModalRegistration />
      <PromptModalRegistration />
      <AlertModalRegistration />
      <ConfirmWithPasswordModalRegistration />
    </>
  );
}
