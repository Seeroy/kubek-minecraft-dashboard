export const serverTypesKeys = {
  all: ["server-types"] as const,
  list: () => [...serverTypesKeys.all, "list"] as const,
  catalog: () => [...serverTypesKeys.all, "catalog"] as const,
  catalogReadme: (id: string, lang: string) => [...serverTypesKeys.catalog(), "readme", id, lang] as const,
  versions: (id: string) => [...serverTypesKeys.all, "versions", id] as const,
  versionOptions: (id: string) => [...serverTypesKeys.all, "version-options", id] as const,
} as const;
