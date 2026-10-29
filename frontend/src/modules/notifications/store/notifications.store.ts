import { generateRandomString } from "@/shared/lib/randomString";
import type { Notification } from "@/shared/types/toast.types";
import { create } from "zustand";

// Matches the toast-out animation so the card finishes leaving before unmount
const EXIT_MS = 250;
const DEFAULT_DURATION_MS = 3500;

export type NotificationInput = Omit<Notification, "id" | "createdAt">;

export interface ToastEntry extends Notification {
  leaving?: boolean;
}

interface NotificationsState {
  notifications: ToastEntry[];
  add: (input: NotificationInput) => string;
  remove: (id: string) => void;
  update: (id: string, data: Partial<Notification>) => void;
}

// One pending auto close per toast, an update with a new duration restarts it
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const useNotificationStore = create<NotificationsState>((set, get) => {
  const schedule = (id: string, duration: number | undefined) => {
    clearTimeout(timers.get(id));
    timers.delete(id);
    if (duration)
      timers.set(
        id,
        setTimeout(() => get().remove(id), duration)
      );
  };

  return {
    notifications: [],

    add: (input) => {
      const id = generateRandomString(16);
      // Errors and progress stay until closed, everything else times out
      const duration =
        input.duration ??
        (input.type && !["error", "progress"].includes(input.type)
          ? DEFAULT_DURATION_MS
          : undefined);
      set((state) => ({
        notifications: [
          ...state.notifications,
          { ...input, id, duration, createdAt: Date.now() },
        ],
      }));
      schedule(id, duration);
      return id;
    },

    remove: (id) => {
      const target = get().notifications.find((n) => n.id === id);
      if (!target || target.leaving) return;
      schedule(id, undefined);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, leaving: true } : n
        ),
      }));
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, EXIT_MS);
    },

    update: (id, data) => {
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, ...data } : n
        ),
      }));
      if ("duration" in data) schedule(id, data.duration);
    },
  };
});
