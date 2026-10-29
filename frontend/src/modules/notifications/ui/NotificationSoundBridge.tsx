"use client";

import { useNotificationTitleStore } from "@/shared/stores/notification-title-store";
import { useEffect } from "react";
import { useNotificationStore } from "../store/notifications.store";
import { readNotificationSound } from "../utils/soundPreference";

const SOUND_URL = "/sounds/notification.mp3";

/** Plays a sound and bumps the tab title for toasts that arrive while the tab is hidden */
export default function NotificationSoundBridge() {
  const increment = useNotificationTitleStore((s) => s.increment);
  const reset = useNotificationTitleStore((s) => s.reset);

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) reset();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [reset]);

  useEffect(() => {
    const seen = new Set(useNotificationStore.getState().notifications.map((n) => n.id));
    let audio: HTMLAudioElement | null = null;

    // Store subscription instead of a selector, this bridge never needs to render
    return useNotificationStore.subscribe(({ notifications }) => {
      let shouldPlay = false;
      for (const notification of notifications) {
        if (seen.has(notification.id)) continue;
        seen.add(notification.id);
        // Background progress updates are not worth a sound
        if (notification.type === "progress" || !document.hidden) continue;
        increment();
        shouldPlay = true;
      }
      if (!shouldPlay || !readNotificationSound()) return;
      audio ??= new Audio(SOUND_URL);
      audio.currentTime = 0;
      // Browsers may reject playback without a prior user gesture
      void audio.play().catch(() => undefined);
    });
  }, [increment]);

  return null;
}
