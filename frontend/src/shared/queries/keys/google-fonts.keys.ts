export const googleFontsKeys = {
  all: ["google-fonts"] as const,
  list: () => [...googleFontsKeys.all, "list"] as const,
} as const;
