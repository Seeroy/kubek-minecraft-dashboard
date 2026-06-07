import {
  ServerStatusIndicator,
  useServerStatus,
  useServerStore,
} from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { ServerStatus } from "@shared/types/server/server.types";
import { ChevronDown, Hourglass, User, UsersRound } from "lucide-react";

const formatUptime = (startedAt?: string): string => {
  if (!startedAt) return "0s";
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

/** Compact one-line status strip: status label + players (popover) + uptime */
const QueryGrid = () => {
  const { selectedServer } = useServerStore();
  const serverStatus = useServerStatus(selectedServer?.id);
  const { t } = useTranslation("modules.sidebar.queryGrid");

  const status = (serverStatus?.status as ServerStatus) ?? ServerStatus.STOPPED;
  const isLive =
    status === ServerStatus.RUNNING || status === ServerStatus.STARTING;

  const playersOnline =
    serverStatus?.players?.online || serverStatus?.runtime?.playersOnline || 0;
  const playersMax = serverStatus?.players?.max || 0;
  const playersList = serverStatus?.players?.list || [];
  const uptime = serverStatus?.runtime?.startedAt
    ? formatUptime(serverStatus.runtime.startedAt)
    : "0s";

  return (
    <div className="flex items-center justify-center gap-3 text-xs">
      <ServerStatusIndicator
        status={status}
        variant="dot"
        size="sm"
        showLabel
        className="[&_span]:text-xs [&_span]:font-medium"
      />

      {isLive && (
        <>
          <Popover>
            <PopoverTrigger
              nativeButton={false}
              render={
                <button className="group flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground">
                  <UsersRound className="h-3.5 w-3.5 text-blue-500" />
                  <span className="font-medium text-foreground tabular-nums">
                    {playersMax > 0
                      ? `${playersOnline}/${playersMax}`
                      : playersOnline}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform group-hover:translate-y-0.5" />
                </button>
              }
            />

            <PopoverContent
              className="w-[280px] bg-popover/80 p-0 backdrop-blur-md"
              align="start"
            >
              <div className="flex items-center justify-between gap-2 border-b border-border/40 p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="shrink-0 rounded-md bg-blue-500/15 p-1.5">
                    <UsersRound className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  <span className="truncate text-sm font-medium">
                    {t("playersOnline")}
                  </span>
                </div>
                <Badge variant="secondary">{playersOnline}</Badge>
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
                  <p className="text-sm">{t("serverEmpty")}</p>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Hourglass className="h-3.5 w-3.5 text-green-500" />
            <span className="font-medium text-foreground tabular-nums">
              {uptime}
            </span>
          </span>
        </>
      )}
    </div>
  );
};

export default QueryGrid;
