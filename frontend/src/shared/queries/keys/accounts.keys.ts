export const accountsKeys = {
  all: ["accounts"] as const,
  list: () => [...accountsKeys.all, "list"] as const,
  byUsername: (username: string) =>
    [...accountsKeys.all, "detail", username] as const,
} as const;
