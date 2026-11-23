export const extensionsKeys = {
  all: ["extensions"] as const,
  list: () => [...extensionsKeys.all, "list"] as const,
  catalog: () => [...extensionsKeys.all, "catalog"] as const,
  catalogReadme: (id: string, lang: string) => [...extensionsKeys.catalog(), "readme", id, lang] as const,
  registry: () => [...extensionsKeys.all, "registry"] as const,
  icons: () => [...extensionsKeys.all, "icons"] as const,
  loginSlots: () => [...extensionsKeys.all, "login-slots"] as const,
  commands: () => [...extensionsKeys.all, "commands"] as const,
  settings: (id: string) => [...extensionsKeys.all, "settings", id] as const,
} as const;
