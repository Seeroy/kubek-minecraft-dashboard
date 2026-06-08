export const javaKeys = {
  all: ["java"] as const,
  list: () => [...javaKeys.all, "list"] as const,
  forGame: (gameVersion: string) =>
    [...javaKeys.all, "for-game", gameVersion] as const,
} as const;
