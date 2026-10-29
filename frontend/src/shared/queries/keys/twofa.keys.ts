export const twofaKeys = {
  all: ["twofa"] as const,
  status: () => [...twofaKeys.all, "status"] as const,
} as const;
