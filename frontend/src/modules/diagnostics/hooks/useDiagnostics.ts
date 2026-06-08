"use client";
import { useSocketStore } from "@/shared/context/socket-context";
import type {
  IServerDiagnostic,
  ServerDiagnosticSeverity,
} from "@shared/types/server/instance.types";
import { WsServerEventTypes } from "@shared/types/ws/server-events.types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { diagnosticsApi } from "../api/diagnostics.api";

const diagnosticsKey = (serverId: string) => ["diagnostics", serverId] as const;

export function useDiagnostics(serverId: string | undefined) {
  const queryClient = useQueryClient();
  const { socket, status, subscribe, unsubscribe } = useSocketStore();

  const query = useQuery({
    queryKey: diagnosticsKey(serverId ?? ""),
    queryFn: () => diagnosticsApi.getForServer(serverId!),
    enabled: !!serverId,
    staleTime: 15_000,
  });

  // Merge live error events into the cached buffer for the active server
  useEffect(() => {
    if (!serverId || status !== "connected" || !socket) return;

    const handler = (data: {
      serverId: string;
      errorType: string;
      severity: string;
      timestamp: string;
    }) => {
      if (data.serverId !== serverId) return;
      queryClient.setQueryData<IServerDiagnostic[]>(
        diagnosticsKey(serverId),
        (prev = []) =>
          [
            ...prev,
            {
              errorType: data.errorType,
              severity: data.severity as ServerDiagnosticSeverity,
              timestamp: data.timestamp,
            },
          ].slice(-20)
      );
    };

    // Drop a diagnostic when the backend reports its condition resolved
    const resolveHandler = (data: { serverId: string; errorType: string }) => {
      if (data.serverId !== serverId) return;
      queryClient.setQueryData<IServerDiagnostic[]>(
        diagnosticsKey(serverId),
        (prev = []) => prev.filter((d) => d.errorType !== data.errorType)
      );
    };

    subscribe(WsServerEventTypes.ERROR_UPDATE, handler);
    subscribe(WsServerEventTypes.ERROR_RESOLVED, resolveHandler);
    return () => {
      unsubscribe(WsServerEventTypes.ERROR_UPDATE, handler);
      unsubscribe(WsServerEventTypes.ERROR_RESOLVED, resolveHandler);
    };
  }, [serverId, status, socket, subscribe, unsubscribe, queryClient]);

  return query;
}
