import type { TranslationDictionary } from "../../../locales/types";

export const logViewerTranslations: TranslationDictionary = {
  title: "Log viewer",
  description: "Server logs, archived .log.gz included",
  refresh: "Refresh",
  noServer: {
    title: "No server selected",
    description: "Pick a server in the sidebar",
  },
  files: {
    title: "Files",
    search: "Find a file",
    current: "Current",
    archive: "Archive",
    empty: "No logs found",
    noMatches: (query: string) => `No files with "${query}"`,
    total: (size: string) => `${size} in total · logs/ folder`,
  },
  viewer: {
    pick: "Pick a file on the left to view it",
    loading: "Loading…",
    empty: "The file is empty",
    search: "Search lines…",
    nothingFound: "Nothing found",
    position: (current: number, total: number) => `${current} / ${total}`,
    prev: "Previous (Shift+Enter)",
    next: "Next (Enter)",
    wrap: "Wrap long lines",
    download: "Download file",
    lines: (n: number) => `${n.toLocaleString()} line${n === 1 ? "" : "s"}`,
  },
};
