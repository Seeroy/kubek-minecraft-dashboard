import { useCallback } from "react";
import { useNotificationsContext } from "../contexts/NotificationProvider";
import { Notification } from "../types";

export const useNotifications = () => {
  const { addNotification, removeNotification, updateNotification } =
    useNotificationsContext();

  const notify = useCallback(
    (n: Omit<Notification, "id" | "createdAt">) => addNotification(n),
    [addNotification]
  );

  const close = useCallback(
    (id: string) => removeNotification(id),
    [removeNotification]
  );

  const update = useCallback(
    (id: string, data: Partial<Notification>) => updateNotification(id, data),
    [updateNotification]
  );

  return { notify, close, update };
};
