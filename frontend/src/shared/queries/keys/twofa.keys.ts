export const twofaKeys = {
  all: ["twofa"] as const,
  status: () => [...twofaKeys.all, "status"] as const,
  preferences: () => [...twofaKeys.all, "preferences"] as const,
} as const;
