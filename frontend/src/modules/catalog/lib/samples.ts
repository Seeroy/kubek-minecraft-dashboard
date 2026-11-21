import type { CatalogItemBase, CatalogItemState, CatalogResponse } from "@shared/types/catalog.types";

/** Base of a fake item for skeletons, kinds add their own fields */
export const sampleItem = (i: number, name: string): CatalogItemBase & CatalogItemState => ({
  id: `sample.catalog-${i}`,
  name,
  description: "Adds a few handy things to the panel and keeps them in sync",
  version: "1.0.0",
  author: "sample-author",
  authorUrl: null,
  engines: { kubek: ">=4.0.0" },
  icon: null,
  iconText: null,
  source: i === 1 ? "official" : "community",
  repo: "sample/repo",
  commit: null,
  homepage: null,
  license: "MIT",
  download: { url: "", sha256: "", size: 0 },
  updatedAt: null,
  compatible: true,
  installedVersion: null,
  updateAvailable: false,
  builtIn: false,
});

export const sampleResponse = <T,>(items: T[]): CatalogResponse<T> => ({
  items,
  blocked: [],
  generatedAt: "",
  fetchedAt: 0,
  stale: false,
});
