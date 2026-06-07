export const configKeys = {
  all: ["config"] as const,
  main: () => [...configKeys.all, "main"] as const,
} as const;
