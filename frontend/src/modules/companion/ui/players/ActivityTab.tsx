"use client";

import type { CompanionEvent, CompanionEventType } from "@/api";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { formatDuration } from "@/shared/lib/formatDuration";
import { formatRelative } from "@/shared/lib/formatRelative";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { Panel, PanelBody, PanelHead, PanelMeta, PanelTitle } from "@/shared/ui/panel";
import { Plate } from "@/shared/ui/plate";
import { PlayerHead } from "@/shared/ui/player-head";
import { Skeleton } from "@/shared/ui/skeleton";
import { Spinner } from "@/shared/ui/spinner";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import type { Tone } from "@/shared/ui/tone";
import { DoorOpen, LogIn, LogOut, MessageSquare, Search, Skull, Timer, TrendingUp, UserX, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useCompanionActivity, useCompanionEvents } from "../../api/companion.queries";
import { useCompanion } from "../../hooks/useCompanion";
import { CompanionRequired } from "../CompanionRequired";
import { FeedSettingsPopover } from "./FeedSettingsPopover";

type Filter = "all" | "sessions" | "deaths" | "chat";

const FILTERS: Record<Filter, CompanionEventType[]> = {
  all: [],
  sessions: ["join", "quit", "kick"],
  deaths: ["death"],
  chat: ["chat"],
};

const LOOK: Partial<Record<CompanionEventType, { icon: LucideIcon; tone: Tone }>> = {
  join: { icon: LogIn, tone: "green" },
  quit: { icon: LogOut, tone: "gray" },
  kick: { icon: UserX, tone: "orange" },
  death: { icon: Skull, tone: "red" },
  chat: { icon: MessageSquare, tone: "blue" },
};

const ACTIVITY_DAYS = 7;

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

function EventRow({ event }: { event: CompanionEvent }) {
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

function Feed({ serverId, chatOn }: { serverId: string; chatOn: boolean }) {
  const { t } = useTranslation("modules.companion.activity");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query.trim(), 300);
  const events = useCompanionEvents(serverId, FILTERS[filter], search);
  const items = events.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Panel className="min-w-0">
      <PanelHead className="flex-wrap gap-3 py-2">
        <PanelTitle>{t("feed")}</PanelTitle>
        <InputGroup className="ml-auto w-full sm:w-52">
          <InputGroupAddon>{events.isFetching && search ? <Spinner className="size-3.5" /> : <Search className="size-3.5" />}</InputGroupAddon>
          <InputGroupInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} aria-label={t("search")} maxLength={100} spellCheck={false} />
        </InputGroup>
        <ToggleGroup variant="segmented" value={[filter]} onValueChange={(next) => next[0] && setFilter(next[0] as Filter)} aria-label={t("feed")}>
          {(Object.keys(FILTERS) as Filter[]).map((key) => (
            <Toggle key={key} variant="segmented" value={key}>
              {t(`filters.${key}`)}
            </Toggle>
          ))}
        </ToggleGroup>
        <FeedSettingsPopover serverId={serverId} />
      </PanelHead>
      {filter === "chat" && !chatOn && <p className="border-b border-border px-4 py-2 text-xs text-muted-foreground">{t("chatOff")}</p>}
      {!events.data ? (
        <div className="grid gap-2 p-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-8 rounded-md" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="px-4 py-12 text-center text-[13px] text-muted-foreground">{search ? t("noMatches") : t("empty")}</p>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {items.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
          {events.hasNextPage && (
            <div className="border-t border-border p-2 text-center">
              <Button variant="ghost" size="sm" disabled={events.isFetchingNextPage} onClick={() => void events.fetchNextPage()}>
                {events.isFetchingNextPage && <Spinner />}
                {t("more")}
              </Button>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

function Summary({ serverId }: { serverId: string }) {
  const { t } = useTranslation("modules.companion.activity");
  const { t: tComponents } = useTranslation("modules.components");
  const activity = useCompanionActivity(serverId, ACTIVITY_DAYS);
  const data = activity.data;

  return (
    <Panel className="min-w-0">
      <PanelHead>
        <Plate tone="green" size="sm">
          <TrendingUp />
        </Plate>
        <PanelTitle>{t("summary")}</PanelTitle>
        <PanelMeta className="ml-auto">{t("period", ACTIVITY_DAYS)}</PanelMeta>
      </PanelHead>
      <PanelBody className="grid gap-4">
        <div>
          <div className="label-caps">{t("peak")}</div>
          <div className="text-[26px] leading-tight font-semibold tabular-nums">{data ? data.peakOnline : "—"}</div>
        </div>
        <div className="grid gap-2">
          <div className="label-caps flex items-center gap-1.5">
            <Timer className="size-3.5" />
            {t("top")}
          </div>
          {!data ? (
            <Skeleton className="h-40 rounded-md" />
          ) : data.top.length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground">{t("noSessions")}</p>
          ) : (
            <ol className="grid gap-1.5">
              {data.top.map((row) => (
                <li key={row.uuid} className="flex items-center gap-2 text-[13px]">
                  <PlayerHead name={row.name} size={20} />
                  <span className="min-w-0 flex-1 truncate">{row.name}</span>
                  <span className="text-xs text-muted-foreground">{t("sessions", row.sessions)}</span>
                  <b className="w-16 text-right font-semibold tabular-nums">{formatDuration(row.playtimeMs / 1000, tComponents)}</b>
                </li>
              ))}
            </ol>
          )}
        </div>
      </PanelBody>
    </Panel>
  );
}

/** Joins, deaths, chat and so on, stored by the panel so it outlives restarts */
export function ActivityTab({ serverId }: { serverId: string }) {
  const { t } = useTranslation("modules.companion.activity");
  const { state, overview } = useCompanion(serverId);

  if (state === "loading") return <Skeleton className="h-80 rounded-lg" />;
  if (state === "missing" || state === "unsupported") return <CompanionRequired serverId={serverId} description={t("required")} />;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <Feed serverId={serverId} chatOn={!!overview?.settings.chat} />
      <Summary serverId={serverId} />
    </div>
  );
}
