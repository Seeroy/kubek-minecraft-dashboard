"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatRelative } from "@/shared/lib/formatRelative";
import { Button } from "@/shared/ui/button";
import { Plate } from "@/shared/ui/plate";
import type { INotification } from "@shared/types/notification.types";
import { X } from "lucide-react";
import type { NotificationView } from "../lib/describe";

interface InboxRowProps {
  notification: INotification;
  view: NotificationView;
  onOpen: () => void;
  onRemove: () => void;
}

export function InboxRow({ notification, view, onOpen, onRemove }: InboxRowProps) {
  const { t } = useTranslation("modules.inbox");
  const Icon = view.icon;
  const unread = !notification.readAt;

  return (
    <li
      data-unread={unread || undefined}
      className="group/row relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-3 py-2.5 transition-colors duration-150 hover:bg-hover data-unread:bg-primary/[0.04]"
    >
      <Plate tone={view.tone} size="sm" className="mt-0.5">
        <Icon />
      </Plate>
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 cursor-pointer text-left outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:outline-primary/70"
      >
        <span className="flex items-baseline gap-2">
          <span className="truncate text-[13px] font-medium text-foreground group-not-data-unread/row:text-muted-foreground">{view.title}</span>
          {unread && <span className="sr-only">{t("filters.unread")}</span>}
        </span>
        {view.description && <span className="mt-0.5 line-clamp-2 block text-[12.5px] text-muted-foreground">{view.description}</span>}
        <time dateTime={new Date(notification.createdAt).toISOString()} className="num mt-1 block text-[11.5px] text-muted-foreground/80">
          {formatRelative(notification.createdAt, t("justNow"))}
        </time>
      </button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={t("remove")}
        title={t("remove")}
        onClick={onRemove}
        className="relative z-1 opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100"
      >
        <X />
      </Button>
    </li>
  );
}
