"use client";
import { cn } from "@/shared/lib/cn";
import { X } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";
import { Notification } from "../types";
import NotificationIcon from "./NotificationIcon";
import NotificationTimerBar from "./NotificationTimerBar";

const tintMap: Record<string, string> = {
  info: "from-blue-500/12",
  success: "from-emerald-500/14",
  warning: "from-amber-500/14",
  error: "from-red-500/12",
  progress: "from-slate-400/10",
};

export default function NotificationItem({
  notification,
}: {
  notification: Notification;
}) {
  const { close } = useNotifications();
  const type = notification.type ?? "info";

  const compact = !notification.message && !notification.actions?.length;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/[0.06] bg-background shadow-[0_12px_32px_-12px_rgba(0,0,0,0.22)] dark:border-white/10">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent to-55%",
          tintMap[type] ?? tintMap.info
        )}
      />

      <div
        className={cn(
          "relative flex gap-3 p-4",
          compact ? "items-center" : "items-start"
        )}
      >
        <NotificationIcon icon={notification.icon} type={notification.type} />

        <div className={cn("min-w-0 flex-1", !compact && "pt-0.5")}>
          <div className="leading-snug font-semibold text-foreground">
            {notification.title}
          </div>

          {notification.message && (
            <div className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {notification.message}
            </div>
          )}

          {notification.actions?.length ? (
            <div className="mt-3 flex items-center gap-5">
              {notification.actions.map((a, i) => (
                <button
                  key={a.key ?? i}
                  onClick={a.onClick}
                  className={cn(
                    "text-sm font-semibold underline-offset-2 transition-colors hover:underline",
                    i === 0
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          onClick={() => close(notification.id)}
          aria-label="Close"
          className="-mt-1 -mr-1 shrink-0 rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <X size={18} />
        </button>
      </div>

      <NotificationTimerBar
        type={type}
        progress={notification.progress}
        duration={notification.duration}
      />
    </div>
  );
}
