"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Bell } from "lucide-react";
import { Suspense, useState } from "react";
import { useUnreadCountQuery } from "../api/inbox.queries";
import { useInboxLiveUpdates } from "../hooks/useInboxLiveUpdates";
import { useInboxPopover } from "../lib/inbox-popover";
import { InboxPanel } from "./InboxPanel";
import { NotificationPrefsDialog } from "./NotificationPrefsButton";

export function InboxBell() {
  const { t } = useTranslation("modules.inbox");
  const open = useInboxPopover((s) => s.open);
  const setOpen = useInboxPopover((s) => s.setOpen);
  const [prefsOpen, setPrefsOpen] = useState(false);
  useInboxLiveUpdates();
  const unread = useUnreadCountQuery().data ?? 0;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative" aria-label={t("bell", unread)} title={t("title")} />}>
          <Bell />
          {unread > 0 && (
            // Keyed by count so every new arrival pops in again
            <span
              key={unread}
              aria-hidden
              className="num absolute top-1 right-1 grid h-4 min-w-4 animate-pop-in place-items-center rounded-full bg-danger px-1 text-[10px] leading-none font-semibold text-destructive-foreground ring-2 ring-background md:top-[3px] md:right-[3px] md:h-3.5 md:min-w-3.5 md:px-[3px] md:text-[9px]"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={6} aria-label={t("title")} className="w-[min(380px,calc(100vw-24px))] gap-0 overflow-hidden p-0">
          {open && (
            <InboxPanel
              onNavigate={() => setOpen(false)}
              onOpenSettings={() => {
                setOpen(false);
                setPrefsOpen(true);
              }}
            />
          )}
        </PopoverContent>
      </Popover>
      {prefsOpen && (
        <Suspense>
          <NotificationPrefsDialog onClose={() => setPrefsOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
