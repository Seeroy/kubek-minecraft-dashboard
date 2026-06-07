import type { TranslationDictionary } from "../../../locales/types";

export const extensionsTranslations: TranslationDictionary = {
  header: {
    kicker: "Extensions",
    title: "Extensions",
    description: "Install panel extensions, review the access they request, enable or remove them",
  },
  upload: {
    hint: "Upload a .kubekext package",
    choose: "Choose file",
  },
  securityNotice: {
    title: "Extension code runs without isolation",
    description: "Installed extensions execute in the panel process without a sandbox (alpha). Only install packages from sources you trust. Installation is restricted to admins.",
  },
  list: {
    loading: "Loading",
    empty: "No extensions installed",
  },
  card: {
    requestedAccess: "Requested access",
    saveConsent: "Save consent",
    enable: "Enable",
    disable: "Disable",
  },
  status: {
    active: "Active",
    installed: "Installed",
    disabled: "Disabled",
    error: "Error",
  },
  notifications: {
    installed: "Extension installed",
    installFailed: "Install failed",
    enabled: "Extension enabled",
    enableFailed: "Enable failed",
    disableFailed: "Disable failed",
    removed: "Extension removed",
    removeFailed: "Remove failed",
    consentFailed: "Consent failed",
    operationFailed: "Operation failed",
  },
};
