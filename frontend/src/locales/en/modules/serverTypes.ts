import type { TranslationDictionary } from "../../../locales/types";

export const serverTypesTranslations: TranslationDictionary = {
  header: {
    kicker: "Server Types",
    title: "Server Types",
    description: "Install and manage blueprint server types from a file",
  },
  upload: {
    hint: "Upload a .kbp or .json blueprint",
    choose: "Choose file",
  },
  securityNotice: {
    title: "Blueprint code runs without isolation",
    description: "Installed blueprints execute their code in the panel process without a sandbox (alpha). Only install from sources you trust. Installation is restricted to admins.",
  },
  list: {
    loading: "Loading",
    empty: "No server types installed",
  },
  source: {
    bundled: "bundled",
    installed: "installed",
  },
  notifications: {
    installed: "Blueprint installed",
    installFailed: "Install failed",
    installError: "Could not install blueprint",
    removed: "Blueprint removed",
    removeFailed: "Remove failed",
    removeError: "Could not remove blueprint",
  },
};
