"use client";

import { useNotificationTitleStore } from "@/shared/stores/notification-title-store";
import { useEffect, useRef } from "react";
import { useNotificationsContext } from "../contexts/NotificationProvider";
import { NOTIFICATION_SOUND_STORAGE_KEY } from "../utils/soundPreference";

const SOUND_URL = "/sounds/notification.mp3";

const isSoundEnabled = () => {
  if (typeof window === "undefined") return true;
  return (
    window.localStorage.getItem(NOTIFICATION_SOUND_STORAGE_KEY) !== "false"
  );
};

const NotificationSoundBridge = () => {
  const { notifications } = useNotificationsContext();
  const increment = useNotificationTitleStore((s) => s.increment);
  const reset = useNotificationTitleStore((s) => s.reset);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const didInitRef = useRef(false);

  if (!didInitRef.current) {
    notifications.forEach((n) => seenIdsRef.current.add(n.id));
    didInitRef.current = true;
  }

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) reset();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [reset]);

  useEffect(() => {
    let shouldPlay = false;
    for (const n of notifications) {
      if (seenIdsRef.current.has(n.id)) continue;
      seenIdsRef.current.add(n.id);
      // Skip background progress updates
      if (n.type === "progress") continue;
      if (typeof document !== "undefined" && document.hidden) {
        increment();
        shouldPlay = true;
      }
    }

    if (shouldPlay && isSoundEnabled()) {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio(SOUND_URL);
          audioRef.current.preload = "auto";
        }
        audioRef.current.currentTime = 0;
        // Browsers may reject playback without prior user gesture
        void audioRef.current.play().catch(() => undefined);
      } catch {
        // I dont care
      }
    }
  }, [notifications, increment]);

  return null;
};

export default NotificationSoundBridge;
