import type { WsMetricsData } from "@shared/types/ws/system.types";
import { create } from "zustand";

// Samples arrive every 10 s, 36 of them cover the last six minutes
const HISTORY_LENGTH = 36;

interface HostMetricsState {
  cpu: number;
  ramUsed: number;
  ramTotal: number;
  // Percent samples, newest last
  cpuHistory: number[];
  ramHistory: number[];
  push: (sample: WsMetricsData) => void;
}

const append = (history: number[], value: number) =>
  history.length < HISTORY_LENGTH ? [...history, value] : [...history.slice(1), value];

export const useHostMetrics = create<HostMetricsState>((set) => ({
  cpu: 0,
  ramUsed: 0,
  ramTotal: 0,
  cpuHistory: [],
  ramHistory: [],
  push: ({ cpu, memory }) => {
    const ramUsed = memory.total - memory.free;
    const ramPercent = memory.total ? (ramUsed / memory.total) * 100 : 0;
    set((state) => ({
      cpu,
      ramUsed,
      ramTotal: memory.total,
      cpuHistory: append(state.cpuHistory, cpu),
      ramHistory: append(state.ramHistory, ramPercent),
    }));
  },
}));
