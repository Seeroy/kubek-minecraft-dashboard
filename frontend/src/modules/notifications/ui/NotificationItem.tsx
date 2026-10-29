"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { X } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";
import type { ToastEntry } from "../store/notifications.store";
import NotificationIcon from "./NotificationIcon";
import NotificationTimerBar from "./NotificationTimerBar";
import { notificationTone } from "./tone";
import { cn } from "@/shared/lib/cn";

export default function NotificationItem({ notification }: { notification: ToastEntry }) {
  const { close } = useNotifications();
  const { t } = useTranslation("modules.notifications");
  const compact = !notification.message && !notification.actions?.length;
  // Actions are buttons, they can't go inside a clickable body
  const clickable = !!notification.onClick && !notification.actions?.length;

  return (
    <div
      data-leaving={notification.leaving || undefined}
      data-compact={compact || undefined}
      className={cn(
        notificationTone[notification.type ?? "info"],
        "pointer-events-auto relative flex w-full animate-toast-in items-start gap-3 overflow-hidden rounded-xl border border-border bg-popover p-3.5 pr-2.5 text-[13px] text-popover-foreground shadow-pop data-compact:items-center data-leaving:animate-toast-out",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-linear-to-br before:from-tone/12 before:to-transparent before:to-55%"
      )}
    >
      <NotificationIcon icon={notification.icon} type={notification.type} />

      <div className="relative min-w-0 flex-1">
        {clickable ? (
          <button
            type="button"
            onClick={() => {
              notification.onClick?.();
              close(notification.id);
            }}
            className="group/open block w-full cursor-pointer rounded-sm text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/70"
          >
            <span className="block text-[13.5px] leading-snug font-semibold underline-offset-2 group-hover/open:underline">{notification.title}</span>
            {notification.message && (
              <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted-foreground">{notification.message}</span>
            )}
          </button>
        ) : (
          <>
            <div className="leading-snug font-semibold text-[13.5px]">{notification.title}</div>
            {notification.message && (
              <div className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{notification.message}</div>
            )}
          </>
        )}
        {notification.actions?.length ? (
          <div className="mt-2 flex items-center gap-4">
            {notification.actions.map((action, index) => (
              <button
                key={action.key ?? index}
                type="button"
                onClick={action.onClick}
                data-primary={index === 0 || undefined}
                className="cursor-pointer text-[12.5px] font-semibold text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline data-primary:text-primary"
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => close(notification.id)}
        aria-label={t("close")}
        className="relative grid size-6 shrink-0 cursor-pointer place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>

      <NotificationTimerBar progress={notification.progress} duration={notification.duration} />
    </div>
  );
}
