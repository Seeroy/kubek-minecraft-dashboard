import type { Tone } from "@/shared/ui/tone";

// Modrinth categories offered as quick filters, in display order
export const CATALOG_CATEGORIES = [
  "management",
  "economy",
  "worldgen",
  "utility",
  "optimization",
  "social",
  "game-mechanics",
  "adventure",
  "technology",
  "minigame",
  "library",
] as const;

const CATEGORY_TONE: Record<string, Tone> = {
  management: "blue",
  economy: "amber",
  worldgen: "green",
  utility: "cyan",
  optimization: "purple",
  social: "pink",
  "game-mechanics": "green",
  adventure: "orange",
  technology: "cyan",
  minigame: "pink",
  library: "gray",
  magic: "purple",
  mobs: "red",
  storage: "amber",
  equipment: "orange",
  transportation: "blue",
  decoration: "pink",
  food: "green",
  cursed: "red",
};

export const categoryTone = (category: string | undefined): Tone => (category && CATEGORY_TONE[category]) || "gray";

// Modrinth mixes loaders like babric or datapack into the same list, only real categories are shown
export const visibleCategories = (categories: string[]) => categories.filter((c) => c in CATEGORY_TONE);
