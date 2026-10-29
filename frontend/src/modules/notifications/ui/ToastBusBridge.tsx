"use client";

import { setToastNotifier } from "@/shared/lib/toast-bus";
import { useEffect } from "react";
import { useNotifications } from "../hooks/useNotifications";

export function ToastBusBridge() {
  const { notify: addNotification } = useNotifications();

  useEffect(() => {
    setToastNotifier(addNotification);
    return () => setToastNotifier(null);
  }, [addNotification]);

  return null;
}
