"use client";
import { readCustomTheme, saveCustomTheme } from "@/shared/lib/color-theme";
import { type CustomTheme, DEFAULT_CUSTOM_THEME } from "@/shared/lib/custom-theme";
import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let current: CustomTheme | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Cached so useSyncExternalStore gets the same object until it changes
const getSnapshot = () => (current ??= readCustomTheme());
const getServerSnapshot = () => DEFAULT_CUSTOM_THEME;

function setCustomTheme(next: CustomTheme | ((prev: CustomTheme) => CustomTheme)) {
  current = typeof next === "function" ? next(getSnapshot()) : next;
  saveCustomTheme(current);
  listeners.forEach((listener) => listener());
}

export function useCustomTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { theme, setTheme: setCustomTheme };
}
