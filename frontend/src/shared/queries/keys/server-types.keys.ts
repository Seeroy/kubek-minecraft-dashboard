export const serverTypesKeys = {
  all: ["server-types"] as const,
  list: () => [...serverTypesKeys.all, "list"] as const,
  catalog: () => [...serverTypesKeys.all, "catalog"] as const,
  versions: (id: string) => [...serverTypesKeys.all, "versions", id] as const,
} as const;
