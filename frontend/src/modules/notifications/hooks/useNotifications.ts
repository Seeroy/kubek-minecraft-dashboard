import { useNotificationStore, type NotificationInput } from "../store/notifications.store";
import type { Notification } from "../types";

// Plain functions over the store, so callers never re-render on new toasts
const actions = {
  notify: (input: NotificationInput) => useNotificationStore.getState().add(input),
  close: (id: string) => useNotificationStore.getState().remove(id),
  update: (id: string, data: Partial<Notification>) => useNotificationStore.getState().update(id, data),
};

export const useNotifications = () => actions;
