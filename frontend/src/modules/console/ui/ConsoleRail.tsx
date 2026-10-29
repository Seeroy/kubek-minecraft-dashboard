"use client";
import { OnlinePlayerMenu } from "@/modules/players/ui/OnlinePlayerMenu";
import { formatDuration } from "@/shared/lib/formatDuration";
import { useNow } from "@/shared/hooks/useNow";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Meter } from "@/shared/ui/meter";
import { PlayerHead } from "@/shared/ui/player-head";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import type { Tone } from "@/shared/ui/tone";
import { ServerStatus } from "@shared/types/server/server.types";
import { Activity, ChevronRight, Clock3, Radio, ScrollText, Tag, UsersRound } from "lucide-react";
import { useConsoleLineCount } from "../hooks/useConsoleLog";
import { MAX_LOG_LINES } from "../store/console-log";
import { AddressCard } from "./AddressCard";
import { InfoCard } from "./InfoCard";

const statusTone: Record<ServerStatus, Tone> = {
  [ServerStatus.RUNNING]: "green",
  [ServerStatus.STOPPED]: "red",
  [ServerStatus.STARTING]: "amber",
  [ServerStatus.STOPPING]: "orange",
  [ServerStatus.CRASHED]: "red",
};

// Status samples arrive about every 10 s
const FRESH_MS = 15_000;
const STALE_MS = 45_000;

const fillTone = (percent: number): Tone => (percent >= 90 ? "red" : percent >= 70 ? "amber" : "green");

function UptimeCard({ startedAt, running }: { startedAt?: string; running: boolean }) {
  const { t } = useTranslation("modules.console.cards");
  const { t: tComponents } = useTranslation("modules.components");
  const now = useNow();
  const started = startedAt ? new Date(startedAt).getTime() : NaN;
  const seconds = running && !Number.isNaN(started) && now ? (now - started) / 1000 : null;
  return <InfoCard icon={Clock3} tone="cyan" label={t("uptime")} value={formatDuration(seconds, tComponents)} />;
}

function FreshnessCard({ timestamp }: { timestamp?: string }) {
  const { t } = useTranslation("modules.console.cards");
  const now = useNow();
  const at = timestamp ? new Date(timestamp).getTime() : NaN;
  const age = Number.isNaN(at) || !now ? null : Math.max(0, now - at);
  const tone: Tone = age === null ? "gray" : age < FRESH_MS ? "green" : age < STALE_MS ? "amber" : "red";

  return (
    <InfoCard
      icon={Radio}
      tone={tone}
      label={t("lastUpdate")}
      value={age === null ? "—" : t("secondsAgo", Math.round(age / 1000))}
      action={age !== null && age < FRESH_MS && <span className="size-2 animate-beat rounded-full bg-tone text-tone" />}
    />
  );
}

function BufferCard() {
  const { t } = useTranslation("modules.console.cards");
  const count = useConsoleLineCount();
  const percent = (count / MAX_LOG_LINES) * 100;
  const tone: Tone = percent >= 100 ? "red" : percent >= 80 ? "amber" : "blue";

  return (
    <InfoCard
      icon={ScrollText}
      tone={tone}
      label={t("bufferedLogs")}
      value={`${count} / ${MAX_LOG_LINES}`}
      extra={<Meter value={percent} tone={tone} className="mt-1" aria-label={t("bufferedLogs")} />}
    />
  );
}

interface ConsoleRailProps {
  serverId: string;
  blueprintId?: string;
  status: ServerStatus;
  version: string;
  players: { online: number; max: number | null; list: string[] } | null;
  startedAt?: string;
  timestamp?: string;
}

export function ConsoleRail({ serverId, blueprintId, status, version, players, startedAt, timestamp }: ConsoleRailProps) {
  const { t } = useTranslation("modules.console.cards");
  const { t: tStatus } = useTranslation("modules.components.serverStatus");
  const fill = players?.max ? (players.online / players.max) * 100 : 0;

  return (
    <aside className="grid content-start gap-2">
      <AddressCard serverId={serverId} blueprintId={blueprintId} />
      <InfoCard icon={Tag} tone="purple" label={t("version")} value={version} />

      <Popover>
        <PopoverTrigger className="block w-full cursor-pointer rounded-lg text-left outline-none focus-visible:outline-2 focus-visible:outline-primary/70 [&>div]:transition-colors [&>div]:hover:bg-hover">
          <InfoCard
            icon={UsersRound}
            tone={players ? fillTone(fill) : "gray"}
            label={t("players")}
            value={players ? (players.max ? `${players.online} / ${players.max}` : players.online) : "—"}
            extra={players?.max ? <Meter value={fill} tone={fillTone(fill)} className="mt-1" aria-label={t("players")} /> : undefined}
            action={<ChevronRight className="size-4 text-muted-foreground" />}
          />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-(--anchor-width) gap-0 p-0">
          <div className="flex items-center justify-between border-b border-border px-3 py-2 text-[13px] font-semibold">
            {t("playersOnline")}
            <span className="text-xs font-normal text-muted-foreground tabular-nums">{players?.online ?? 0}</span>
          </div>
          {players && players.list.length > 0 ? (
            <div className="scrollbar-thin max-h-64 overflow-y-auto p-1">
              {players.list.map((name) => (
                <div key={name} className="group/player flex h-8 items-center gap-2 rounded-sm pr-0.5 pl-2 text-[13px] hover:bg-hover">
                  <PlayerHead name={name} size={20} />
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                  <OnlinePlayerMenu
                    serverId={serverId}
                    blueprintId={blueprintId}
                    name={name}
                    className="opacity-0 group-hover/player:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">{t("serverEmpty")}</p>
          )}
        </PopoverContent>
      </Popover>

      <InfoCard icon={Activity} tone={statusTone[status]} label={t("status")} value={<span className="text-tone">{tStatus(status)}</span>} />
      <UptimeCard startedAt={startedAt} running={status === ServerStatus.RUNNING} />
      <FreshnessCard timestamp={timestamp} />
      <BufferCard />
    </aside>
  );
}
