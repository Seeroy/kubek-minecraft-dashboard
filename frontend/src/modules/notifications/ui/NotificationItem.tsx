"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useNotifications } from "../hooks/useNotifications";
import type { ToastEntry } from "../store/notifications.store";
import NotificationIcon from "./NotificationIcon";
import NotificationCloseButton from "./NotificationCloseButton";
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
        {notification.progress !== undefined && (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(notification.progress)}
            className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-tone/14"
          >
            <div
              className="h-full origin-left rounded-full bg-tone transition-[scale] duration-300 ease-out"
              style={{ scale: `${Math.min(Math.max(notification.progress, 0), 100) / 100} 1` }}
            />
          </div>
        )}
        {notification.actions?.length ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {notification.actions.map((action, index) => (
              <button
                key={action.key ?? index}
                type="button"
                onClick={action.onClick}
                data-primary={index === 0 || undefined}
                className="h-7 cursor-pointer rounded-full bg-secondary px-3 text-[12.5px] font-semibold text-muted-foreground transition-colors outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone/70 data-primary:bg-tone/14 data-primary:text-tone data-primary:hover:bg-tone/22"
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <NotificationCloseButton label={t("close")} onClose={() => close(notification.id)} duration={notification.duration} />
    </div>
  );
}
