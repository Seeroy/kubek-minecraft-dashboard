"use client";

import { generateRandomString } from "@/shared/lib/randomString";
import React, { createContext, useCallback, useContext, useState } from "react";
import { Notification } from "../types";

interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, "id" | "createdAt">) => string;
  removeNotification: (id: string) => void;
  updateNotification: (id: string, data: Partial<Notification>) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null
);

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (n: Omit<Notification, "id" | "createdAt">) => {
      const id = generateRandomString(16);
      // Compute the effective duration before building the object, so the stored
      // notification carries the same value the auto-dismiss timer uses
      const duration =
        n.duration ??
        (n.type && !["error", "progress"].includes(n.type) ? 3500 : undefined);
      const newNotification: Notification = {
        ...n,
        id,
        duration,
        createdAt: Date.now(),
      };
      setNotifications((prev) => [...prev, newNotification]);

      if (duration) {
        setTimeout(() => removeNotification(id), duration);
      }
      return id;
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const updateNotification = useCallback(
    (id: string, data: Partial<Notification>) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...data } : n))
      );
    },
    []
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        updateNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationsContext = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error(
      "useNotificationsContext must be used within NotificationProvider"
    );
  return ctx;
};
