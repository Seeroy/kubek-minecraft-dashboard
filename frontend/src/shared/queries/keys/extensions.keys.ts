export const extensionsKeys = {
  all: ["extensions"] as const,
  list: () => [...extensionsKeys.all, "list"] as const,
  registry: () => [...extensionsKeys.all, "registry"] as const,
  icons: () => [...extensionsKeys.all, "icons"] as const,
} as const;
