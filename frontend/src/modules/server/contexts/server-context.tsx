"use client";
import { useSocketStore } from "@/shared/context/socket-context";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useServerStatusesStore } from "../store/server-statuses.store";
import type { Server, ServerStatusData } from "../types";

export type { Server, ServerStatusData };

interface ServerContextValue {
  servers: Server[];
  selectedServer: Server | null;
  setServers: (servers: Server[]) => void;
  selectServer: (serverId: string) => void;
  updateServer: (serverId: string, updates: Partial<Server>) => void;
  clear: () => void;
}

const ServerContext = createContext<ServerContextValue | undefined>(undefined);

const LOCAL_KEY = "selected_server_id";

export function ServerProvider({ children }: { children: React.ReactNode }) {
  const [servers, setServersState] = React.useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = React.useState<Server | null>(
    null
  );
  const { subscribe, unsubscribe, socket } = useSocketStore();

  const serverIdsKey = servers.map((s) => s.id).join(",");
  useEffect(() => {
    const savedId = localStorage.getItem(LOCAL_KEY);
    if (savedId && servers.length > 0) {
      const savedServer = servers.find((s) => s.id === savedId);
      if (savedServer) {
        setSelectedServer(savedServer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverIdsKey]);

  const setServers = useCallback((newServers: Server[]) => {
    // The socket list payload is reduced
    const isSocketUpdate =
      newServers.length > 0 &&
      newServers.some((server) => !("restartOnError" in server));

    setServersState((prevServers) => {
      if (isSocketUpdate) {
        return newServers.map((newServer) => {
          const existingServer = prevServers.find((s) => s.id === newServer.id);
          if (existingServer) {
            return {
              ...newServer,
              restartOnError: existingServer.restartOnError,
            };
          }
          return newServer;
        });
      } else {
        return newServers;
      }
    });

    if (newServers.length === 0) {
      setSelectedServer(null);
      return;
    }

    setSelectedServer((current) => {
      if (current) {
        const updatedServer = newServers.find((s) => s.id === current.id);
        if (updatedServer) {
          if (isSocketUpdate) {
            return { ...updatedServer, restartOnError: current.restartOnError };
          } else {
            return updatedServer;
          }
        }
      }

      const savedId = localStorage.getItem(LOCAL_KEY);
      const savedServer = newServers.find((s) => s.id === savedId);
      return savedServer || newServers[0] || null;
    });
  }, []);

  const selectServer = useCallback(
    (serverId: string) => {
      const previousServer = selectedServer;
      const newServer = servers.find((s) => s.id === serverId);
      if (!newServer) return;

      if (previousServer) {
        socket?.emit("room:unsubscribe", `server:${previousServer.id}`);
      }
      socket?.emit("room:subscribe", `server:${newServer.id}`);

      setSelectedServer(newServer);
      localStorage.setItem(LOCAL_KEY, newServer.id);
    },
    [selectedServer, servers, socket?.emit]
  );

  const updateServer = useCallback(
    (serverId: string, updates: Partial<Server>) => {
      setServersState((prev) =>
        prev.map((server) =>
          server.id === serverId ? { ...server, ...updates } : server
        )
      );
      setSelectedServer((current) =>
        current?.id === serverId ? { ...current, ...updates } : current
      );
    },
    []
  );

  const clear = useCallback(() => {
    if (selectedServer) {
      socket?.emit("room:unsubscribe", `server:${selectedServer.id}`);
    }
    setServersState([]);
    setSelectedServer(null);
    useServerStatusesStore.getState().clearAll();
    localStorage.removeItem(LOCAL_KEY);
  }, [selectedServer, socket?.emit]);

  const handleServerList = useCallback(
    (servers: Server[]) => {
      setServers(servers);
      // Seed the status store so per-server selectors have data before the
      // first status_update tick arrives
      const store = useServerStatusesStore.getState();
      for (const server of servers) {
        if (server.status) {
          store.updateStatus({ serverId: server.id, status: server.status });
        }
      }
    },
    [setServers]
  );

  const handleServerStatusUpdate = useCallback(
    (data: {
      serverId: string;
      status:
        | ServerStatusData["status"]
        | { status: ServerStatusData["status"] };
      timestamp: string;
    }) => {
      const statusValue =
        typeof data.status === "string"
          ? data.status
          : data.status?.status || "unknown";

      // Live status lives only in the status store
      useServerStatusesStore.getState().updateStatus({
        serverId: data.serverId,
        status: statusValue,
        timestamp: data.timestamp,
      });
    },
    []
  );

  const handleServerQueryData = useCallback(
    (data: {
      serverId: string;
      players?: { online: number; max: number; list?: string[] };
      version?: string;
      runtime?: { playersOnline?: number; startedAt?: string };
      error?: string;
      timestamp: string;
    }) => {
      useServerStatusesStore.getState().updateQueryData(data.serverId, data);
    },
    []
  );

  useEffect(() => {
    subscribe("server:list", handleServerList);
    subscribe("server:status_update", handleServerStatusUpdate);
    subscribe("server:query_data", handleServerQueryData);

    return () => {
      unsubscribe("server:list", handleServerList);
      unsubscribe("server:status_update", handleServerStatusUpdate);
      unsubscribe("server:query_data", handleServerQueryData);
    };
  }, [
    subscribe,
    unsubscribe,
    handleServerList,
    handleServerStatusUpdate,
    handleServerQueryData,
  ]);

  useEffect(() => {
    if (!selectedServer) return;
    socket?.emit("room:subscribe", `server:${selectedServer.id}`);
    return () => {
      socket?.emit("room:unsubscribe", `server:${selectedServer.id}`);
    };
  }, [selectedServer?.id, socket?.emit]);

  const value = useMemo<ServerContextValue>(
    () => ({
      servers,
      selectedServer,
      setServers,
      selectServer,
      updateServer,
      clear,
    }),
    [servers, selectedServer, setServers, selectServer, updateServer, clear]
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
