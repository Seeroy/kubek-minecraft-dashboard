"use client";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useEffect } from "react";
import { useCommandPalette } from "../hooks/useCommandPalette";
import CommandPalette from "./CommandPalette";

/** Registers the global Cmd/Ctrl+K shortcut and renders the palette */
export function CommandPaletteProvider() {
  const toggle = useCommandPalette((s) => s.toggle);
  const setOpen = useCommandPalette((s) => s.setOpen);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle, isAuthenticated]);

  // Force-close if the session ends while the palette is open
  useEffect(() => {
    if (!isAuthenticated) setOpen(false);
  }, [isAuthenticated, setOpen]);

  if (!isAuthenticated) return null;
  return <CommandPalette />;
}
