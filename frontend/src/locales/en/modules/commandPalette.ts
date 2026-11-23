export const commandPaletteTranslations = {
  title: "Command palette",
  placeholder: "Search pages, servers and actions...",
  empty: "No results",
  hints: {
    current: "Current",
  },
  footer: {
    navigate: "select",
    open: "open",
    close: "close",
  },
  groups: {
    navigation: "Navigation",
    servers: "Servers",
    actions: "Actions",
    extension: "Extensions",
  },
  actions: {
    start: "Start server",
    stop: "Stop server",
    restart: "Restart server",
    kill: "Force stop",
    createBackup: "Create backup",
    createServer: "Create server",
  },
  extensionCommand: {
    done: (title: string) => `Command "${title}" done`,
    failed: (title: string) => `Command "${title}" failed`,
  },
};
