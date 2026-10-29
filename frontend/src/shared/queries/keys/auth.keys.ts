export const authKeys = {
  all: ["auth"] as const,
  profile: () => [...authKeys.all, "profile"] as const,
  challenge: (challengeId: string) => [...authKeys.all, "challenge", challengeId] as const,
} as const;
