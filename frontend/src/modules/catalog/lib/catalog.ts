import type { Tone } from "@/shared/ui/tone";
import type { CatalogItemBase, CatalogItemState } from "@shared/types/catalog.types";
import type { LucideIcon } from "lucide-react";

export type CatalogEntry = CatalogItemBase & CatalogItemState;

export const CATALOG_FILTERS = ["all", "official", "community", "updates"] as const;
export type CatalogFilter = (typeof CATALOG_FILTERS)[number];

export const CATALOG_SORTS = ["name", "updated"] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

/** A kind-specific badge on a card or row, like Docker or a risky permission */
export interface CatalogMark {
  key: string;
  label: string;
  tone?: Tone;
  warning?: boolean;
  icon?: LucideIcon;
  title?: string;
}

export const matchesFilter = (item: CatalogEntry, filter: CatalogFilter) =>
  filter === "all" ? true : filter === "updates" ? item.updateAvailable : item.source === filter;

export function sortItems<T extends CatalogEntry>(items: T[], sort: CatalogSort): T[] {
  const sorted = [...items];
  if (sort === "updated") sorted.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  else sorted.sort((a, b) => a.name.localeCompare(b.name));
  return sorted;
}

export const repoUrl = (item: Pick<CatalogEntry, "repo">) => `https://github.com/${item.repo}`;

/** Where the user can read the code before installing */
export const sourceUrl = (item: Pick<CatalogEntry, "repo" | "homepage">) => item.homepage ?? repoUrl(item);

const MB = 1024 * 1024;
export const formatSize = (bytes: number) => (bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
