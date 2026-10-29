import type { InstalledPluginView } from "@shared/types/plugins";
import { visibleCategories } from "./categories";

export const displayName = (item: InstalledPluginView) =>
  item.metadata?.title ?? item.fileName.replace(/\.jar$/i, "");

export const fileNameOf = (item: InstalledPluginView) => item.version?.files[0]?.filename ?? item.fileName;

export const primaryCategory = (categories: string[] | undefined) => visibleCategories(categories ?? [])[0];
