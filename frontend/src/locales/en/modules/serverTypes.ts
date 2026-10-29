import type { TranslationDictionary } from "../../../locales/types";

export const serverTypesTranslations: TranslationDictionary = {
  title: "Server types",
  description: "Install and manage server types (blueprints)",
  refresh: "Refresh",
  notice: {
    title: "Blueprint code runs without isolation",
    description:
      "Installed blueprints run their code inside the panel process with no sandbox. Install them only from trusted sources. Installing is limited to administrators.",
  },
  upload: {
    title: "Upload a .kbp or .json blueprint",
    hint: "Drop the file here or pick it manually",
    choose: "Choose file",
    installing: "Installing…",
  },
  filters: {
    all: "All",
    bundled: "Bundled",
    installed: "Installed",
    search: "Find a server type",
  },
  source: {
    bundled: "bundled",
    installed: "installed",
  },
  features: {
    console: "Console",
    backups: "Backups",
    files: "Files",
    players: "Players",
    "plugins:modrinth": "Plugins",
    "mods:fabric": "Mods",
  },
  meta: {
    runtime: "Runtime",
    portsAndVariables: "Ports · variables",
    usedBy: "Used by",
    servers: (n: number) => `${n} server${n === 1 ? "" : "s"}`,
    unused: "not used",
  },
  remove: "Remove",
  inUse: "Cannot remove: servers use this type",
  confirmRemove: {
    title: (name: string) => `Remove server type "${name}"?`,
    description: "The blueprint disappears from the server creation wizard",
    confirm: "Remove",
    cancel: "Cancel",
  },
  empty: {
    title: "Nothing found",
    description: "Try another query",
  },
  toasts: {
    installed: (name: string) => `Server type ${name} installed`,
    removed: (name: string) => `Server type ${name} removed`,
  },
};
