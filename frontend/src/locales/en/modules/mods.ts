import type { TranslationDictionary } from "../../../locales/types";

const count = (n: number) => `${n} mod${n === 1 ? "" : "s"}`;

export const modsTranslations: TranslationDictionary = {
  title: "Mods",
  description: "Install and manage server mods",
  notAvailable: {
    title: "Mods are not available",
    description: (server: string) => `Mods run on servers with the Fabric loader, while ${server} uses another core.`,
    switchTo: (server: string) => `Switch to ${server}`,
  },
  count,
  empty: {
    title: "No mods installed yet",
    description: "Open the Available tab to find mods and install them in one click",
  },
  searchPlaceholder: "Search Modrinth mods…",
  catalogEnd: "No more mods to load",
  unsupported: "This mod does not run on the server side",
  install: {
    title: "Install mod",
    update: "Update mod",
    scheduled: "Mod installation scheduled",
    updateScheduled: "Mod update scheduled",
    updatesScheduled: (n: number) => `Update scheduled for ${count(n)}`,
  },
  remove: {
    title: "Remove mod",
    description: (name: string) => `This removes ${name} from the server`,
    dependants: "Remove dependencies too",
    dependantsDescription: (names: string) => `Also remove what was installed as a dependency: ${names}`,
    removed: (file: string) => `Removed ${file}`,
  },
  upload: {
    progress: "Uploading mods…",
    noJar: "Pick mod files in .jar format",
    done: (n: number) => `Uploaded ${count(n)}`,
    partial: (ok: number, fail: number) => `Uploaded ${ok}, failed ${fail}`,
    drop: "Drop .jar files to install",
  },
};
