const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const dashboardTranslations = {
  header: {
    title: "Dashboard",
    greeting: {
      morning: (name: string) => (name ? `Good morning, ${name}` : "Good morning"),
      day: (name: string) => (name ? `Good afternoon, ${name}` : "Good afternoon"),
      evening: (name: string) => (name ? `Good evening, ${name}` : "Good evening"),
      night: (name: string) => (name ? `Good night, ${name}` : "Good night"),
    },
    summary: (running: number, total: number, players: number) =>
      `${running} of ${total} ${plural(total, "server", "servers")} running · ${players} ${plural(players, "player", "players")} online`,
  },
  actions: {
    allServers: "All servers",
    createServer: "Create server",
  },
  toolbar: {
    edit: "Customize",
    done: "Done",
    reset: "Reset",
    addWidget: "Add widget",
    hide: "Hide widget",
  },
  widgets: {
    servers: "Servers",
    hostLoad: "Host load",
    events: "Events",
  },
  overview: {
    title: "Summary",
    serversOnline: "Servers online",
    starting: (n: number) => `${n} starting`,
    players: "Players online",
    cpu: "Host CPU",
    ram: "Host RAM",
  },
  servers: {
    filter: {
      label: "Filter",
      all: "All",
      running: "Running",
      offline: "Offline",
    },
    columns: {
      server: "Server",
      status: "Status",
      type: "Type",
      players: "Players",
      cpu: "CPU",
      ram: "RAM",
      uptime: "Uptime",
    },
    empty: "No servers yet",
    emptyFiltered: "No servers with this status",
    start: "Start",
    restart: "Restart",
    console: "Console",
    memory: (used: string, limit: string) => `${used} / ${limit} GB`,
    memoryUsed: (used: string) => `${used} GB`,
  },
  hostLoad: {
    range: "Time range",
    hour: "1 h",
    day: "24 h",
    now: "now",
    note: {
      live: "updates every 10 s",
      "1h": "average per minute",
      "24h": "average per 15 minutes",
    },
    start: {
      live: "−6 min",
      "1h": "−60 min",
      "24h": "−24 h",
    },
  },
  events: {
    scheduled: "Scheduled",
    recent: "Recent",
    empty: "Nothing yet",
  },
  justNow: "just now",
};
