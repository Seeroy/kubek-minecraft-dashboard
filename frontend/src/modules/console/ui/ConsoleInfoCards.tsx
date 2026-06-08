import { Badge } from "@/shared/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { ScrollArea } from "@/shared/ui/scroll-area";
import {
  Activity,
  ChevronRight,
  Clock3,
  Link2,
  Terminal,
  User,
  UsersRound,
} from "lucide-react";
import { useTranslation } from "../../../shared/hooks/useTranslation";
import { AddressCard } from "./AddressCard";
import { InfoCard } from "./InfoCard";

interface ConsoleInfoCardsProps {
  serverId: string;
  version: string;
  playersOnline: number;
  playersMax: number | null;
  playersList: string[];
  serverState: string;
  uptime: string;
  lastUpdate: string;
  logLength: number;
  maxLogLines: number;
}

function getStatusColor(serverState: string): {
  bgClass: string;
  textClass: string;
} {
  switch (serverState.toLowerCase()) {
    case "online":
    case "running":
    case "active":
      return { bgClass: "bg-emerald-500/15", textClass: "text-emerald-400" };
    case "offline":
    case "stopped":
    case "inactive":
      return { bgClass: "bg-rose-500/15", textClass: "text-rose-400" };
    case "starting":
    case "restarting":
      return { bgClass: "bg-amber-500/15", textClass: "text-amber-400" };
    case "stopping":
      return { bgClass: "bg-orange-500/15", textClass: "text-orange-400" };
    case "error":
    case "crashed":
      return { bgClass: "bg-red-500/15", textClass: "text-red-400" };
    default:
      return { bgClass: "bg-slate-500/15", textClass: "text-slate-400" };
  }
}

export function ConsoleInfoCards({
  serverId,
  version,
  playersOnline,
  playersMax,
  playersList,
  serverState,
  uptime,
  lastUpdate,
  logLength,
  maxLogLines,
}: ConsoleInfoCardsProps) {
  const { t } = useTranslation("modules.console");
  const statusColors = getStatusColor(serverState);

  const playersLabel =
    playersMax && playersMax > 0
      ? `${playersOnline} / ${playersMax}`
      : `${playersOnline}`;

  return (
    <div className="space-y-3">
      <AddressCard serverId={serverId} />
      <InfoCard
        icon={Link2}
        label={t("console.cards.version")}
        value={version}
        iconBgClass="bg-violet-500/15"
        iconTextClass="text-violet-400"
      />

      <Popover>
        <PopoverTrigger className="block w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
          <InfoCard
            icon={UsersRound}
            label={t("console.cards.players")}
            value={playersLabel}
            iconBgClass="bg-emerald-500/15"
            iconTextClass="text-emerald-400"
            action={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
            className="hover:bg-secondary/40"
          />
        </PopoverTrigger>
        <PopoverContent
          className="mt-1.5 bg-popover/80 p-0 backdrop-blur-md"
          align="end"
          style={{ width: "var(--anchor-width)" }}
        >
          <div className="border-b border-border/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="shrink-0 rounded-md bg-blue-500/15 p-1.5">
                  <UsersRound className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <span className="truncate text-sm font-medium">
                  {t("console.cards.playersOnline")}
                </span>
              </div>
              <Badge variant="secondary">{playersOnline}</Badge>
            </div>
          </div>
          {playersList.length > 0 ? (
            <ScrollArea className="h-64">
              <div className="p-2">
                {playersList.map((playerName, index) => (
                  <div
                    key={`${playerName}-${index}`}
                    className="flex items-center gap-2 rounded-md p-2 transition-colors hover:bg-accent"
                  >
                    <img
                      src={`https://minotar.net/avatar/${playerName}/24`}
                      alt={playerName}
                      className="h-6 w-6 flex-shrink-0 rounded-full"
                    />
                    <span className="truncate text-sm">{playerName}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <User className="mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">{t("console.cards.serverEmpty")}</p>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <InfoCard
        icon={Activity}
        label={t("console.cards.status")}
        value={t(`console.status.${serverState.toLowerCase()}`, serverState)}
        iconBgClass={statusColors.bgClass}
        iconTextClass={statusColors.textClass}
      />
      <InfoCard
        icon={Clock3}
        label={t("console.cards.uptime")}
        value={uptime}
        iconBgClass="bg-cyan-500/15"
        iconTextClass="text-cyan-400"
      />
      <InfoCard
        icon={Clock3}
        label={t("console.cards.lastUpdate")}
        value={lastUpdate}
        iconBgClass="bg-indigo-500/15"
        iconTextClass="text-indigo-400"
      />
      <InfoCard
        icon={Terminal}
        label={t("console.cards.bufferedLogs")}
        value={`${logLength} / ${maxLogLines}`}
        iconBgClass="bg-primary/15"
        iconTextClass="text-primary"
      />
    </div>
  );
}
