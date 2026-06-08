export const aboutKeys = {
  all: ["about"] as const,
  version: () => [...aboutKeys.all, "version"] as const,
  updateCheck: () => [...aboutKeys.all, "update-check"] as const,
  releases: () => [...aboutKeys.all, "releases"] as const,
} as const;
