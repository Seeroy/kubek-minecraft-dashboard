"use client";

import { setToastNotifier } from "@/shared/lib/toast-bus";
import { useEffect } from "react";
import { useNotificationsContext } from "../contexts/NotificationProvider";

export function ToastBusBridge() {
  const { addNotification } = useNotificationsContext();

  useEffect(() => {
    setToastNotifier(addNotification);
    return () => setToastNotifier(null);
  }, [addNotification]);

  return null;
}
