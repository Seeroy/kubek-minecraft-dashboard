"use client";
import { useNotificationStore } from "../store/notifications.store";
import NotificationItem from "./NotificationItem";

export default function NotificationCenter() {
  const notifications = useNotificationStore((s) => s.notifications);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 left-4 z-100 flex flex-col items-end gap-2 sm:left-auto sm:w-[360px]"
    >
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
}
