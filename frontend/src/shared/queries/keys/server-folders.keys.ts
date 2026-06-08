export const serverFoldersKeys = {
  all: ["serverFolders"] as const,
  list: () => [...serverFoldersKeys.all, "list"] as const,
} as const;
