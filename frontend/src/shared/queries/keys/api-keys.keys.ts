export const apiKeysKeys = {
  all: ["apiKeys"] as const,
  list: (scope: "own" | "all") => [...apiKeysKeys.all, "list", scope] as const,
  mcp: () => [...apiKeysKeys.all, "mcp"] as const,
} as const;
