"use client";

import CommandInput from "@/modules/console/ui/CommandInput";
import LogRow from "@/modules/console/ui/LogRow";
import { DiagnosticsPanel } from "@/modules/diagnostics";
import { ExtensionSlot } from "@/modules/extensions";
import { useServerStatus, useServerStore } from "@/modules/server";
import { useSocketStore } from "@/shared/context/socket-context";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { PageLayout } from "@/shared/ui/PageLayout";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { IInstanceLog } from "@shared/types/server/instance.types";
import { WsServerEventTypes } from "@shared/types/ws/server-events.types";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Terminal } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "../../../shared/hooks/useTranslation";
import { ConsoleInfoCards } from "./ConsoleInfoCards";

const MAX_LOG_LINES = 5000;
const AUTOSCROLL_THRESHOLD_PX = 32;

function appendCapped(
  prev: IInstanceLog[],
  next: IInstanceLog
): IInstanceLog[] {
  if (prev.length < MAX_LOG_LINES) return [...prev, next];
  return [...prev.slice(prev.length - MAX_LOG_LINES + 1), next];
}

function formatUptime(startedAt?: string): string {
  if (!startedAt) return "-";
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return "-";

  const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatTime(timestamp?: string): string {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const Console = () => {
  const { t } = useTranslation("modules.console");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const [log, setLog] = useState<IInstanceLog[]>([]);
  const { selectedServer } = useServerStore();
  const serverStatus = useServerStatus(selectedServer?.id);
  const { socket, status, subscribe, unsubscribe } = useSocketStore();

  const playersList = serverStatus?.players?.list || [];
  const playersOnline =
    serverStatus?.players?.online ?? serverStatus?.runtime?.playersOnline ?? 0;
  const playersMax = serverStatus?.players?.max ?? null;
  const version = serverStatus?.version || selectedServer?.core?.version || "-";
  const uptime = formatUptime(serverStatus?.runtime?.startedAt);
  const lastUpdate = formatTime(serverStatus?.timestamp);
  const serverState =
    selectedServer?.status || serverStatus?.status || "unknown";

  const virtualizer = useVirtualizer({
    count: log.length,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => 22,
    overscan: 20,
  });

  const requestFullLog = useCallback(async () => {
    if (!selectedServer?.id) return;
    const fullLog: any[] = await socket?.emitWithAck(
      WsServerEventTypes.REQUEST_FULL_LOG,
      { serverId: selectedServer.id }
    );
    if (fullLog && fullLog.length > 0) {
      const capped =
        fullLog.length > MAX_LOG_LINES
          ? fullLog.slice(fullLog.length - MAX_LOG_LINES)
          : fullLog;
      setLog(capped as IInstanceLog[]);
    }
  }, [selectedServer?.id, socket]);

  useEffect(() => {
    setLog([]);
    stickToBottomRef.current = true;
    requestFullLog();
  }, [selectedServer?.id, requestFullLog]);

  useEffect(() => {
    if (status !== "connected" || !socket || !selectedServer) return;

    const handleFullLog = (data: {
      serverId: string;
      data: IInstanceLog[];
      timestamp: string;
    }) => {
      if (data?.serverId !== selectedServer.id) return;
      const incoming = data.data;
      const capped =
        incoming.length > MAX_LOG_LINES
          ? incoming.slice(incoming.length - MAX_LOG_LINES)
          : incoming;
      setLog(capped);
    };

    const handleLogUpdate = (data: IInstanceLog) => {
      if (data?.serverId !== selectedServer.id) return;
      setLog((prev) => appendCapped(prev, data));
    };

    subscribe(WsServerEventTypes.LOG_UPDATE, handleLogUpdate);
    subscribe(WsServerEventTypes.FULL_LOG, handleFullLog);

    return () => {
      unsubscribe(WsServerEventTypes.LOG_UPDATE, handleLogUpdate);
      unsubscribe(WsServerEventTypes.FULL_LOG, handleFullLog);
    };
  }, [status, socket, selectedServer, subscribe, unsubscribe]);

  const handleCommand = useCallback(
    (command: string) => {
      if (!selectedServer || !socket || status !== "connected") return;
      socket.emit(WsServerEventTypes.SUBMIT_COMMAND, {
        serverId: selectedServer.id,
        command,
      });
    },
    [selectedServer, socket, status]
  );

  const handleScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom <= AUTOSCROLL_THRESHOLD_PX;
  }, []);

  useLayoutEffect(() => {
    if (!stickToBottomRef.current || log.length === 0) return;
    virtualizer.scrollToIndex(log.length - 1, { align: "end" });
  }, [log.length, virtualizer]);

  if (!selectedServer) {
    return (
      <PageLayout className="flex h-full flex-col">
        <BlockHeader
          kicker={t("header.kicker")}
          title={t("header.title")}
          description={t("header.description")}
          icon={Terminal}
          color="primary"
        />
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="text-muted-foreground">
            {t("console.noServerSelected")}
          </div>
        </div>
      </PageLayout>
    );
  }

  const items = virtualizer.getVirtualItems();

  return (
    <PageLayout className="flex h-full flex-col">
      <BlockHeader
        kicker={t("header.kicker")}
        title={t("header.title")}
        description={t("header.description")}
        icon={Terminal}
        color="primary"
      />
      <div className="flex flex-1 flex-col gap-5 md:min-h-0 md:flex-row">
        <div className="flex h-[calc(100svh-10rem)] shrink-0 flex-col gap-5 md:h-auto md:min-h-0 md:flex-1 md:shrink">
          <div
            ref={scrollerRef}
            onScroll={handleScroll}
            className="relative min-h-0 flex-1 overflow-y-auto rounded-md border bg-secondary/50 p-4 font-mono text-sm"
          >
            {log.length === 0 ? (
              <div className="text-muted-foreground">{t("console.noLogs")}</div>
            ) : (
              <TooltipProvider delay={300}>
                <div
                  style={{
                    height: virtualizer.getTotalSize(),
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {items.map((virtualRow) => (
                    <div
                      key={virtualRow.key}
                      ref={virtualizer.measureElement}
                      data-index={virtualRow.index}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                        paddingBottom: 2,
                      }}
                    >
                      <LogRow data={log[virtualRow.index]} />
                    </div>
                  ))}
                </div>
              </TooltipProvider>
            )}
          </div>
          <ExtensionSlot
            name="server.console.actions"
            context={{ serverId: selectedServer.id }}
          />
          <CommandInput
            onInputSubmit={handleCommand}
            extraSuggestions={playersList}
          />
        </div>
        <div className="flex w-full shrink-0 flex-col gap-5 md:w-80">
          <ConsoleInfoCards
            serverId={selectedServer.id}
            version={version}
            playersOnline={playersOnline}
            playersMax={playersMax}
            playersList={playersList}
            serverState={serverState}
            uptime={uptime}
            lastUpdate={lastUpdate}
            logLength={log.length}
            maxLogLines={MAX_LOG_LINES}
          />
          <DiagnosticsPanel hideWhenEmpty />
        </div>
      </div>
    </PageLayout>
  );
};

export default Console;
