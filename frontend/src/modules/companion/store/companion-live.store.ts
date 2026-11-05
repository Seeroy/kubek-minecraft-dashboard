import type { CompanionLive } from "@/api";
import { create } from "zustand";

interface CompanionLiveState {
  /** Pushed by the panel over the socket, newer than the REST overview */
  byServer: Record<string, CompanionLive>;
  set: (serverId: string, state: CompanionLive) => void;
}

export const useCompanionLiveStore = create<CompanionLiveState>((set) => ({
  byServer: {},
  set: (serverId, state) => set((s) => ({ byServer: { ...s.byServer, [serverId]: state } })),
}));
