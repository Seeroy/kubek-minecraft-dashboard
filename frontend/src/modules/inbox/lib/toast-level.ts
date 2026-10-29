import type { NotificationSeverity } from "@shared/types/notification.types";
import { useSyncExternalStore } from "react";

/** Which notifications pop up as toasts, saved in this browser */
export type InboxToastLevel = "all" | "errors" | "off";

export const INBOX_TOAST_LEVELS: InboxToastLevel[] = ["all", "errors", "off"];

const STORAGE_KEY = "kubek:inboxToastLevel";
const DEFAULT_LEVEL: InboxToastLevel = "all";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readInboxToastLevel(): InboxToastLevel {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return INBOX_TOAST_LEVELS.includes(value as InboxToastLevel) ? (value as InboxToastLevel) : DEFAULT_LEVEL;
  } catch {
    return DEFAULT_LEVEL;
  }
}

export function setInboxToastLevel(level: InboxToastLevel) {
  try {
    localStorage.setItem(STORAGE_KEY, level);
  } catch {
    // Private mode or blocked storage, keep the default
  }
  listeners.forEach((listener) => listener());
}

export function useInboxToastLevel() {
  return useSyncExternalStore(subscribe, readInboxToastLevel, () => DEFAULT_LEVEL);
}

export function passesToastLevel(level: InboxToastLevel, severity: NotificationSeverity) {
  if (level === "off") return false;
  if (level === "errors") return severity === "error";
  return true;
}
