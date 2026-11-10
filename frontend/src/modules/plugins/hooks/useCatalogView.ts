"use client";
import { useState } from "react";

export type CatalogLayout = "cards" | "table";

const STORAGE_KEY = "content_catalog_view";

const stored = (): CatalogLayout => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "table" ? "table" : "cards";
  } catch {
    return "cards";
  }
};

/** Catalog layout, remembered across visits */
export function useCatalogView() {
  const [view, setView] = useState<CatalogLayout>(stored);

  const changeView = (next: CatalogLayout) => {
    setView(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // private mode, keep it for this visit only
    }
  };

  return { view, changeView };
}
