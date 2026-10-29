export const networksKeys = {
  all: ["networks"] as const,
  list: () => [...networksKeys.all, "list"] as const,
  candidates: () => [...networksKeys.all, "candidates"] as const,
  plan: (props: unknown) => [...networksKeys.all, "plan", props] as const,
} as const;
