import type { TranslationDictionary } from "../../../locales/types";

export const commonModalsTranslations: TranslationDictionary = {
  confirm: {
    defaultTitle: "Confirm action",
    confirmText: "Confirm",
    cancelText: "Cancel",
  },
  prompt: {
    defaultTitle: "Enter a value",
    confirmText: "Confirm",
    cancelText: "Cancel",
    validationRequired: "Value cannot be empty",
  },
  alert: {
    confirmText: "OK",
    variants: {
      info: "Information",
      warning: "Warning",
      error: "Error",
      success: "Success",
    },
  },
  confirmWithPassword: {
    defaultTitle: "Confirm action",
    passwordLabel: "Your password",
    passwordPlaceholder: "Enter your password",
    nameLabel: "Type the name to confirm",
    nameMismatch: "Name does not match",
    passwordRequired: "Password is required",
    confirmText: "Confirm",
    cancelText: "Cancel",
  },
};
