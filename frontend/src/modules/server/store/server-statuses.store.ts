import type { Server, ServerStatusData } from "@/modules/server/types";
import type { ServerStatus } from "@shared/types/server/server.types";
import type { WsServerQueryData } from "@shared/types/ws/server-payloads.types";
import { create } from "zustand";

interface ServerStatusesState {
  statuses: Record<string, ServerStatusData>;

  updateStatus: (data: ServerStatusData) => void;
  updateQueryData: (serverId: string, queryData: WsServerQueryData) => void;
  /** Statuses from the server list, same place as status_update */
  seedFromList: (servers: Pick<Server, "id" | "status">[]) => void;
}

export const useServerStatusesStore = create<ServerStatusesState>((set) => ({
  statuses: {},

  updateStatus: (data) =>
    set((state) => ({
      statuses: {
        ...state.statuses,
        [data.serverId]: {
          ...state.statuses[data.serverId],
          ...data,
          timestamp: data.timestamp || state.statuses[data.serverId]?.timestamp,
        },
      },
    })),

  updateQueryData: (serverId, queryData) =>
    set((state) => ({
      statuses: {
        ...state.statuses,
        [serverId]: {
          ...state.statuses[serverId],
          serverId,
          players: queryData.players ?? state.statuses[serverId]?.players,
          runtime: {
            ...state.statuses[serverId]?.runtime,
            ...queryData.runtime,
          },
          version: queryData.version ?? state.statuses[serverId]?.version,
          timestamp: queryData.timestamp ?? state.statuses[serverId]?.timestamp,
        },
      },
    })),

  seedFromList: (servers) =>
    set((state) => {
      // List comes every 10s, keep the map if nothing changed
      if (servers.every((server) => state.statuses[server.id]?.status === server.status)) return state;
      const statuses = { ...state.statuses };
      for (const server of servers) {
        statuses[server.id] = {
          ...statuses[server.id],
          serverId: server.id,
          status: server.status,
        };
      }
      return { statuses };
    }),
}));

/** Live status from the socket, else the fallback */
export const resolveServerStatus = (
  live: Pick<ServerStatusData, "status"> | null | undefined,
  fallback: ServerStatus
): ServerStatus => live?.status ?? fallback;

/** Status of one server, re-renders only on change */
export function useServerStatus(serverId: string | null | undefined, fallback: ServerStatus): ServerStatus;
export function useServerStatus(serverId: string | null | undefined, fallback?: ServerStatus): ServerStatus | undefined;
export function useServerStatus(serverId: string | null | undefined, fallback?: ServerStatus) {
  const live = useServerStatusesStore((s) => (serverId ? s.statuses[serverId]?.status : undefined));
  return live ?? fallback;
}

/** Live players, runtime and version of one server */
export const useServerLive = (serverId: string | undefined | null) =>
  useServerStatusesStore((s) =>
    serverId ? (s.statuses[serverId] ?? null) : null
  );

// Full map (for ServerStatusNotifier and the ServersList badge)
export const useAllServerStatuses = () =>
  useServerStatusesStore((s) => s.statuses);
