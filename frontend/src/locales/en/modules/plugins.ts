import type { TranslationDictionary } from "../../../locales/types";

const count = (n: number) => `${n} plugin${n === 1 ? "" : "s"}`;

export const pluginsTranslations: TranslationDictionary = {
  title: "Plugins",
  description: "Install and manage server plugins",
  notAvailable: {
    title: "Plugins are not available",
    description: (server: string) => `Plugins run on Paper, Purpur and Spigot, while ${server} uses another core.`,
    switchTo: (server: string) => `Switch to ${server}`,
  },
  count,
  empty: {
    title: "No plugins installed yet",
    description: "Open the Available tab to find plugins and install them in one click",
  },
  searchPlaceholder: "Search Modrinth plugins…",
  catalogEnd: "No more plugins to load",
  unsupported: "This plugin does not run on the server side",
  install: {
    title: "Install plugin",
    update: "Update plugin",
    scheduled: "Plugin installation scheduled",
    updateScheduled: "Plugin update scheduled",
    updatesScheduled: (n: number) => `Update scheduled for ${count(n)}`,
  },
  remove: {
    title: "Remove plugin",
    description: (name: string) => `This removes ${name} from the server`,
    dependants: "Remove dependencies too",
    dependantsDescription: (names: string) => `Also remove what was installed as a dependency: ${names}`,
    removed: (file: string) => `Removed ${file}`,
  },
  upload: {
    progress: "Uploading plugins…",
    noJar: "Pick plugin files in .jar format",
    done: (n: number) => `Uploaded ${count(n)}`,
    partial: (ok: number, fail: number) => `Uploaded ${ok}, failed ${fail}`,
    drop: "Drop .jar files to install",
  },
};
