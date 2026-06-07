import type { TranslationDictionary } from "../../../locales/types";

export const javaManagerTranslations: TranslationDictionary = {
  header: {
    kicker: "Runtime",
    title: "Java Manager",
    description: "Manage installed Java versions and server runtime usage",
  },
  available: {
    title: "Available Java Versions",
    description: "Install additional Java versions from Adoptium",
    versionLabel: (version: string) => `Version ${ version }`,
    installed: "Installed",
  },
  installed: {
    title: "Installed Java Versions",
    description: "Java versions available for use by your servers",
    empty: {
      title: "No Java versions installed",
      description: "Switch to the \"Available\" tab to install Java versions",
    },
    badge: "Installed",
    vendor: (vendor: string) => `Vendor: ${ vendor }`,
    runtime: (runtime: string) => `Runtime: ${ runtime }`,
    usage: (count: number) => `Used by ${ count } server${ count === 1 ? "" : "s" }`,
  },
  serverUsage: {
    title: "Server Java Usage",
    description: "Java versions currently used by your servers",
    empty: {
      title: "No servers configured",
      description: "Create servers to see Java version usage",
    },
    versionLabel: (version: string, isManaged: boolean) => `Java ${ version } ${ isManaged ? "(Managed)" : "(System)" }`,
    managed: "Managed",
    system: "System",
  },
  tabs: {
    installed: (count: number) => `Installed (${ count })`,
    available: (count: number) => `Available (${ count })`,
    serverUsage: (count: number) => `Server Usage (${ count })`,
  },
  buttons: {
    refreshing: "Refreshing",
    refresh: "Refresh",
  },
  notifications: {
    installStarted: (version: string) => `Java ${ version } installation started`,
    installMessage: "You can track the progress in the tasks panel",
    deleteSuccess: (version: string) => `Java ${ version } deleted successfully`,
  },
  errors: {
    loadFailed: "Failed to load Java versions",
    installFailed: "Failed to start Java installation",
    deleteFailed: "Failed to delete Java version",
    deleteInUseTitle: "Cannot delete Java version",
    deleteInUseMessage: "This version is currently used by one or more servers",
  },
};