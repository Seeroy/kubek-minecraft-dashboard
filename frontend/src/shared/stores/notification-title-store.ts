import { create } from "zustand";

interface NotificationTitleState {
  unread: number;
  increment: () => void;
  reset: () => void;
}

export const useNotificationTitleStore = create<NotificationTitleState>(
  (set) => ({
    unread: 0,
    increment: () => set((s) => ({ unread: s.unread + 1 })),
    reset: () => set({ unread: 0 }),
  })
);
