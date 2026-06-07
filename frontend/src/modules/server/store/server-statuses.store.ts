import type { ServerStatusData } from "@/modules/server";
import { create } from "zustand";

interface ServerStatusesState {
  statuses: Record<string, ServerStatusData>;

  updateStatus: (data: ServerStatusData) => void;
  updateQueryData: (
    serverId: string,
    queryData: {
      players?: { online: number; max: number; list?: string[] };
      runtime?: { playersOnline?: number; startedAt?: string };
      version?: string;
      timestamp?: string;
    }
  ) => void;
  clearAll: () => void;
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

  clearAll: () => set({ statuses: {} }),
}));

// Per-server selector - a component re-renders only when its own server status changes
export const useServerStatus = (serverId: string | undefined | null) =>
  useServerStatusesStore((s) =>
    serverId ? (s.statuses[serverId] ?? null) : null
  );

// Full map (for ServerStatusNotifier and the ServersList badge)
export const useAllServerStatuses = () =>
  useServerStatusesStore((s) => s.statuses);
