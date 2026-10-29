"use client";

import { DiagnosticsPanel } from "@/modules/diagnostics";
import { ExtensionSlot } from "@/modules/extensions";
import { resolveServerStatus, useServerLive, useServerStore, type Server } from "@/modules/server";
import { TopbarActions } from "@/modules/topbar";
import { useSocketApi, useSocketState } from "@/shared/context/socket-context";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAccess } from "@/shared/lib/access";
import { Badge } from "@/shared/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import InputWithHistory from "@/shared/ui/InputWithHistory";
import { StatusDot } from "@/shared/ui/status-dot";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { AccessArea } from "@shared/access/areas";
import { ServerStatus } from "@shared/types/server/server.types";
import { WsServerEventTypes } from "@shared/types/ws/server-events.types";
import { useCallback } from "react";
import { useConsoleLogFeed } from "../hooks/useConsoleLog";
import { ConsoleRail } from "./ConsoleRail";
import { LogPanel } from "./LogPanel";
import { ServerOff } from "lucide-react";

const statusBadge: Record<ServerStatus, "success" | "secondary" | "warning" | "destructive"> = {
  [ServerStatus.RUNNING]: "success",
  [ServerStatus.STOPPED]: "secondary",
  [ServerStatus.STARTING]: "warning",
  [ServerStatus.STOPPING]: "warning",
  [ServerStatus.CRASHED]: "destructive",
};

function ServerConsole({ server }: { server: Server }) {
  const { t } = useTranslation("modules.console");
  const { t: tStatus } = useTranslation("modules.components.serverStatus");
  const { getSocket } = useSocketApi();
  const { status: socketStatus } = useSocketState();
  const live = useServerLive(server.id);
  const canSend = useAccess([AccessArea.CONSOLE, "write"], server.id);
  useConsoleLogFeed(server.id);

  const status = resolveServerStatus(live, server.status);
  // The status store keeps the last sample after a stop, so players only count while running
  const running = status === ServerStatus.RUNNING;
  const players = running
    ? {
        online: live?.players?.online ?? live?.runtime?.playersOnline ?? 0,
        max: live?.players?.max ?? null,
        list: live?.players?.list ?? [],
      }
    : null;
  const connected = socketStatus === "connected";

  const sendCommand = useCallback(
    (command: string) => {
      const value = command.trim();
      if (!value || !connected) return;
      getSocket()?.emit(WsServerEventTypes.SUBMIT_COMMAND, { serverId: server.id, command: value });
    },
    [connected, getSocket, server.id]
  );

  // Asks the server's own line editor to complete the line, docker servers have no PTY for it
  const requestCompletion = useCallback(
    async (line: string): Promise<{ completion: string; candidates: string[] }> => {
      const empty = { completion: line, candidates: [] };
      const socket = getSocket();
      if (!socket || !connected) return empty;
      try {
        return (await socket.emitWithAck(WsServerEventTypes.REQUEST_COMPLETION, { serverId: server.id, line })) ?? empty;
      } catch {
        return empty;
      }
    },
    [connected, getSocket, server.id]
  );

  return (
    <div className="grid gap-4 lg:h-full lg:min-h-[520px] lg:grid-cols-[minmax(0,1fr)_300px]">
      <TopbarActions>
        <Badge variant={statusBadge[status]} className="max-md:hidden">
          <StatusDot status={status} className="size-1.5" />
          {tStatus(status)}
        </Badge>
      </TopbarActions>

      <TooltipProvider delay={300}>
        <LogPanel
          serverName={server.name}
          headerActions={<ExtensionSlot name="server.console.actions" context={{ serverId: server.id }} />}
          footer={
            canSend && (
              <div className="flex h-13 shrink-0 items-center gap-2 border-t border-border pr-2 pl-4">
                <span aria-hidden className="font-mono text-sm font-semibold text-primary">
                  ›
                </span>
                <InputWithHistory
                  placeholder={t("command.placeholder")}
                  submitLabel={t("command.send")}
                  onInputSubmit={sendCommand}
                  extraSuggestions={players?.list ?? []}
                  onRequestCompletion={server.runtimeKind !== "docker" ? requestCompletion : undefined}
                  inputClassName="h-9 border-0 bg-transparent px-0 font-mono text-[13px] focus-visible:ring-0"
                />
              </div>
            )
          }
        />
      </TooltipProvider>

      <div className="grid content-start gap-4 lg:min-h-0 lg:overflow-y-auto">
        <ConsoleRail
          serverId={server.id}
          blueprintId={server.blueprintId}
          status={status}
          version={live?.version || (server.variables?.GAME_VERSION as string | undefined) || "—"}
          players={players}
          startedAt={live?.runtime?.startedAt}
          timestamp={live?.timestamp}
        />
        <DiagnosticsPanel hideWhenEmpty />
      </div>
    </div>
  );
}

export default function Console() {
  const { t } = useTranslation("modules.console");
  const { selectedServer } = useServerStore();

  if (!selectedServer) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ServerOff />
          </EmptyMedia>
          <EmptyTitle>{t("noServer.title")}</EmptyTitle>
          <EmptyDescription>{t("noServer.description")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  // Keyed so a server switch starts with a fresh buffer and scroll position
  return <ServerConsole key={selectedServer.id} server={selectedServer} />;
}
