"use client";
import { useSyncExternalStore } from "react";

function detectMac(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform ??
    navigator.platform ??
    "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}

// Platform is static for the page's lifetime, so there is nothing to subscribe to
const emptySubscribe = () => () => {};

/**
 * Resolves the platform-specific command modifier label (⌘ on macOS, Ctrl
 * elsewhere)
 */
export function usePlatformModifier() {
  const isMac = useSyncExternalStore(emptySubscribe, detectMac, () => false);
  return { isMac, mod: isMac ? "⌘" : "Ctrl" };
}
