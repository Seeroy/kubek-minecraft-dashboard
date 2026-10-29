"use client";

import { useSocketApi, useSocketState } from "@/shared/context/socket-context";
import type { IInstanceLog } from "@shared/types/server/instance.types";
import { WsServerEventTypes } from "@shared/types/ws/server-events.types";
import { useEffect, useSyncExternalStore } from "react";
import { consoleLog } from "../store/console-log";

/** Feeds the console buffer from the socket for one server */
export function useConsoleLogFeed(serverId: string) {
  const { subscribe, unsubscribe, getSocket } = useSocketApi();
  const { status } = useSocketState();

  useEffect(() => {
    consoleLog.clear();

    const onLine = (line: IInstanceLog) => {
      if (line?.serverId === serverId) consoleLog.append(line);
    };
    const onFullLog = (payload: { serverId: string; data: IInstanceLog[] }) => {
      if (payload?.serverId === serverId) consoleLog.replace(payload.data);
    };

    subscribe(WsServerEventTypes.LOG_UPDATE, onLine);
    subscribe(WsServerEventTypes.FULL_LOG, onFullLog);
    return () => {
      unsubscribe(WsServerEventTypes.LOG_UPDATE, onLine);
      unsubscribe(WsServerEventTypes.FULL_LOG, onFullLog);
    };
  }, [serverId, subscribe, unsubscribe]);

  // The history is requested again after every reconnect
  useEffect(() => {
    if (status !== "connected") return;
    // A late answer for the previous server must not overwrite the new one
    let current = true;
    void getSocket()
      ?.emitWithAck(WsServerEventTypes.REQUEST_FULL_LOG, { serverId })
      .then((lines: IInstanceLog[] | undefined) => current && lines?.length && consoleLog.replace(lines));
    return () => {
      current = false;
    };
  }, [serverId, status, getSocket]);
}

/** Current lines plus a version that changes with them, the array itself is mutated in place */
export function useConsoleLines() {
  const version = useSyncExternalStore(consoleLog.subscribe, consoleLog.getVersion, consoleLog.getVersion);
  return { lines: consoleLog.getLines(), version };
}

/** Line count only, for widgets that do not render the lines */
export function useConsoleLineCount() {
  return useSyncExternalStore(
    consoleLog.subscribe,
    () => consoleLog.getLines().length,
    () => 0
  );
}
