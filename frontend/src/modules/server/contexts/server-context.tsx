"use client";
import { useSocketStore } from "@/shared/context/socket-context";
import { serverRoom, WsRoomEventTypes } from "@shared/types/ws/room-events.types";
import { WsServerEventTypes } from "@shared/types/ws/server-events.types";
import type {
  WsServerListItem,
  WsServerQueryData,
  WsServerStatusUpdate,
} from "@shared/types/ws/server-payloads.types";
import { useQueryClient } from "@tanstack/react-query";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  applyServerListPush,
  useServersListQuery,
} from "../api/servers.queries";
import { useServerStatusesStore } from "../store/server-statuses.store";
import type { Server, ServerStatusData } from "../types";

export type { Server, ServerStatusData };

interface ServerContextValue {
  servers: Server[];
  selectedServer: Server | null;
  selectServer: (serverId: string) => void;
}

const ServerContext = createContext<ServerContextValue | undefined>(undefined);

const LOCAL_KEY = "selected_server_id";
const NO_SERVERS: Server[] = [];

const readSavedId = () => {
  try {
    return localStorage.getItem(LOCAL_KEY);
  } catch {
    return null;
  }
};

/** Picked server, else the saved one, else the first */
function pickSelected(servers: Server[], selectedId: string | null) {
  if (servers.length === 0) return null;
  const savedId = readSavedId();
  return (
    servers.find((s) => s.id === selectedId) ??
    servers.find((s) => s.id === savedId) ??
    servers[0]
  );
}

export function ServerProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: servers = NO_SERVERS } = useServersListQuery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { subscribe, unsubscribe, socket, status } = useSocketStore();

  const selectedServer = useMemo(
    () => pickSelected(servers, selectedId),
    [servers, selectedId]
  );

  const selectServer = useCallback(
    (serverId: string) => {
      if (!servers.some((s) => s.id === serverId)) return;
      setSelectedId(serverId);
      localStorage.setItem(LOCAL_KEY, serverId);
    },
    [servers]
  );

  useEffect(() => {
    const handleServerList = (rows: WsServerListItem[]) =>
      applyServerListPush(queryClient, rows);

    // Live status lives only in the status store
    const handleServerStatusUpdate = (data: WsServerStatusUpdate) =>
      useServerStatusesStore.getState().updateStatus({
        serverId: data.serverId,
        status: data.status.status,
        timestamp: data.timestamp,
      });

    const handleServerQueryData = (data: WsServerQueryData) =>
      useServerStatusesStore.getState().updateQueryData(data.serverId, data);

    subscribe(WsServerEventTypes.LIST, handleServerList);
    subscribe(WsServerEventTypes.STATUS_UPDATE, handleServerStatusUpdate);
    subscribe(WsServerEventTypes.QUERY_DATA, handleServerQueryData);

    return () => {
      unsubscribe(WsServerEventTypes.LIST, handleServerList);
      unsubscribe(WsServerEventTypes.STATUS_UPDATE, handleServerStatusUpdate);
      unsubscribe(WsServerEventTypes.QUERY_DATA, handleServerQueryData);
    };
  }, [subscribe, unsubscribe, queryClient]);

  // The only room subscribe, rooms are lost on reconnect so it depends on status
  const selectedServerId = selectedServer?.id;
  useEffect(() => {
    if (!socket || !selectedServerId || status !== "connected") return;
    socket.emit(WsRoomEventTypes.ROOM_SUBSCRIBE, serverRoom(selectedServerId));
    return () => {
      socket.emit(
        WsRoomEventTypes.ROOM_UNSUBSCRIBE,
        serverRoom(selectedServerId)
      );
    };
  }, [socket, status, selectedServerId]);

  const value = useMemo<ServerContextValue>(
    () => ({ servers, selectedServer, selectServer }),
    [servers, selectedServer, selectServer]
  );

  return (
    <ServerContext.Provider value={value}>{children}</ServerContext.Provider>
  );
}

export function useServerStore() {
  const context = useContext(ServerContext);
  if (context === undefined) {
    throw new Error("useServerStore must be used within a ServerProvider");
  }
  return context;
}
