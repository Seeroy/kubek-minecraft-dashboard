import type { TranslationDictionary } from "../../../locales/types";

export const logViewerTranslations: TranslationDictionary = {
  header: {
    title: "Log viewer",
    description: "Server logs, including archived .log.gz files",
  },
  list: {
    title: "Files",
    empty: "No log files found",
    gz: "GZ",
    sizeBytes: (size: number) => `${ size } B`,
    refresh: "Refresh",
  },
  content: {
    title: "Content",
    noSelection: "Select a file on the left to view",
    loading: "Loading...",
    tailHint: (n: number) => `Showing last ${ n } line(s)`,
    fullFile: "Full file",
    tail: (n: number) => `Tail: ${ n }`,
  },
  search: {
    placeholder: "Search inside file...",
    matches: (count: number) => `${ count } matches`,
    nothingFound: "No matches",
  },
  noServer: "Select a server first",
};
