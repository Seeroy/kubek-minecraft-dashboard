"use client";
import {
  applyStreamerLevel,
  isHiddenAt,
  maskText,
  maskValue,
  readStreamerLevel,
  STREAMER_MODE_KEY,
  toStreamerLevel,
  type Sensitivity,
  type StreamerLevel,
} from "@/shared/lib/streamer-mode";
import { useMemo, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

// Another tab, e.g. an OBS browser source, follows the switch
function onStorage(event: StorageEvent) {
  if (event.key !== STREAMER_MODE_KEY) return;
  applyStreamerLevel(toStreamerLevel(event.newValue), false);
  notify();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function setStreamerLevel(level: StreamerLevel) {
  applyStreamerLevel(level);
  notify();
}

export const useStreamerLevel = () => useSyncExternalStore(subscribe, readStreamerLevel, () => "off" as const);

export const useStreamerHidden = (sensitivity: Sensitivity = "basic") => isHiddenAt(useStreamerLevel(), sensitivity);

const keep = (value: string) => value;

/** For text that can't be wrapped in Private, like toasts and titles */
export function useStreamerMask(sensitivity: Sensitivity = "basic") {
  const enabled = useStreamerHidden(sensitivity);
  return useMemo(
    () => ({ enabled, text: enabled ? maskText : keep, value: enabled ? maskValue : keep }),
    [enabled]
  );
}
