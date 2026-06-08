import type { Notification } from "@/shared/types/notification.types";

type Notify = (n: Omit<Notification, "id" | "createdAt">) => string;

let notifyImpl: Notify | null = null;

export function setToastNotifier(fn: Notify | null) {
  notifyImpl = fn;
}

export function emitToast(n: Omit<Notification, "id" | "createdAt">): void {
  if (notifyImpl) {
    notifyImpl(n);
  } else if (typeof console !== "undefined") {
    console.warn("[toast-bus] notifier not registered:", n.title);
  }
}
