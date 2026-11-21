"use client";

import type { CompanionEvent, CompanionEventType } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatDuration } from "@/shared/lib/formatDuration";
import { formatRelative } from "@/shared/lib/formatRelative";
import { Plate } from "@/shared/ui/plate";
import type { Tone } from "@/shared/ui/tone";
import { DoorOpen, LogIn, LogOut, MessageSquare, Skull, UserX, type LucideIcon } from "lucide-react";

const LOOK: Partial<Record<CompanionEventType, { icon: LucideIcon; tone: Tone }>> = {
  join: { icon: LogIn, tone: "green" },
  quit: { icon: LogOut, tone: "gray" },
  kick: { icon: UserX, tone: "orange" },
  death: { icon: Skull, tone: "red" },
  chat: { icon: MessageSquare, tone: "blue" },
};

function EventText({ event }: { event: CompanionEvent }) {
  const { t } = useTranslation("modules.companion.activity.events");
  const { t: tComponents } = useTranslation("modules.components");
  const name = event.name ?? "?";
  switch (event.type) {
    case "join":
      return <>{event.firstJoin ? t("firstJoin", name) : t("join", name)}</>;
    case "quit":
      return <>{t("quit", name, formatDuration((event.session ?? 0) / 1000, tComponents))}</>;
    case "kick":
      return <>{event.reason ? t("kickReason", name, event.reason) : t("kick", name)}</>;
    case "death":
      return <>{event.message ?? t("death", name)}</>;
    case "chat":
      return (
        <>
          <b className="font-semibold">{name}:</b> {event.message}
        </>
      );
    default:
      return <>{event.type}</>;
  }
}

export function EventRow({ event }: { event: CompanionEvent }) {
  const { t } = useTranslation("modules.companion.activity");
  const look = LOOK[event.type] ?? { icon: DoorOpen, tone: "gray" as Tone };
  const Icon = look.icon;
  return (
    <li className="flex items-center gap-3 px-4 py-2 text-[13px] transition-colors hover:bg-hover">
      <Plate tone={look.tone} size="sm">
        <Icon />
      </Plate>
      <span className="min-w-0 flex-1 break-words">
        <EventText event={event} />
      </span>
      <time className="shrink-0 text-xs text-muted-foreground tabular-nums" dateTime={new Date(event.ts).toISOString()} title={new Date(event.ts).toLocaleString()}>
        {formatRelative(event.ts, t("justNow"))}
      </time>
    </li>
  );
}
