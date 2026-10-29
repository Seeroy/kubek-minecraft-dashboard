import type { TranslationDictionary } from "../../../locales/types";

export const componentsTranslations: TranslationDictionary = {
  settings: {
    changed: "changed",
    unsaved: (n: number) => `${n} unsaved ${n === 1 ? "change" : "changes"}`,
    reset: "Reset",
    save: "Save",
  },
  justNow: "just now",
  duration: {
    days: (d: number, h: number) => `${d}d ${h}h`,
    hours: (h: number, m: number) => `${h}h ${m}m`,
    minutes: (m: number) => `${m}m`,
  },
  inputWithHistory: {
    placeholder: "Enter text",
  },
  secret: {
    saved: "Saved, leave blank to keep",
    savedHint: (hint: string) => `Saved, ends with ${hint}. Leave blank to keep`,
    show: "Show",
    hide: "Hide",
  },
  taskStages: {
    kinds: {
      proxy: (name: string) => `Proxy "${name}"`,
      server: (name: string) => `Server "${name}"`,
      fabricProxy: (name: string) => `FabricProxy-Lite for "${name}"`,
      networkConfigs: "Network configs and folder",
      downloadPack: "Downloading the modpack",
      readPack: "Checking pack files",
    },
    steps: {
      searchingCore: "Looking up the build",
      downloadingCore: "Downloading the core",
      pullingImage: "Pulling the Docker image",
      checkingJava: "Checking Java",
      downloadingJava: "Downloading Java",
      unpackingJava: "Unpacking Java",
      creatingBat: "Start scripts",
      completed: "Finishing",
    },
    waiting: "Queued",
    failed: "Failed",
  },
  pageWidth: {
    toggle: "Toggle page width",
  },
  serverStatus: {
    running: "Running",
    stopped: "Stopped",
    starting: "Starting",
    stopping: "Stopping",
    crashed: "Crashed",
  },
  statusButton: {
    loading: "Loading...",
    success: "Success",
    error: "Error",
    idle: "Idle",
  },
};
