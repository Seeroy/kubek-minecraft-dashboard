"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useNotificationsContext } from "../contexts/NotificationProvider";
import NotificationItem from "./NotificationItem";

export default function NotificationCenter() {
  const { notifications } = useNotificationsContext();

  return (
    <div className="fixed top-2 right-2 left-2 z-50 flex flex-col gap-2 sm:top-4 sm:right-4 sm:left-auto sm:w-96">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <NotificationItem notification={n} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
