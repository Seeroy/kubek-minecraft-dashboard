"use client";
import { useState } from "react";

export type ServersView = "cards" | "table";

const VIEW_STORAGE_KEY = "servers_list_view";

const getStoredView = (): ServersView => {
  if (typeof window === "undefined") return "cards";
  const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
  return saved === "table" ? "table" : "cards";
};

/** Servers list view mode (cards / table), persisted across sessions */
export function useServersView() {
  const [view, setView] = useState<ServersView>(getStoredView);

  const changeView = (next: ServersView) => {
    setView(next);
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
  };

  return { view, changeView };
}
