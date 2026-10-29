"use client";
import { applyColorTheme, readColorTheme, type ColorTheme } from "@/shared/lib/color-theme";
import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setColorTheme(theme: ColorTheme) {
  applyColorTheme(theme);
  listeners.forEach((listener) => listener());
}

const getServerSnapshot = (): ColorTheme => "default";

export function useColorTheme() {
  const theme = useSyncExternalStore(subscribe, readColorTheme, getServerSnapshot);
  return { theme, setTheme: setColorTheme };
}
