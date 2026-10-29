import { useSyncExternalStore } from "react";

export const NOTIFICATION_SOUND_STORAGE_KEY = "kubek:notificationSoundEnabled";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const readNotificationSound = () =>
  localStorage.getItem(NOTIFICATION_SOUND_STORAGE_KEY) !== "false";

function setNotificationSound(enabled: boolean) {
  localStorage.setItem(NOTIFICATION_SOUND_STORAGE_KEY, String(enabled));
  listeners.forEach((listener) => listener());
}

export function useNotificationSound() {
  const enabled = useSyncExternalStore(subscribe, readNotificationSound, () => true);
  return [enabled, setNotificationSound] as const;
}
