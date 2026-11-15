import type { ContentKind } from "@/api";
import { create } from "zustand";

interface InstallQueueState {
  // Keys of projects with an install in flight, from the click until the task ends
  keys: Record<string, true>;
  add: (keys: string[]) => void;
  remove: (key: string) => void;
}

export const installKey = (kind: ContentKind, serverId: string, projectId: string) => `${kind}:${serverId}:${projectId}`;

export const useInstallQueue = create<InstallQueueState>((set) => ({
  keys: {},
  add: (keys) => set((state) => ({ keys: { ...state.keys, ...Object.fromEntries(keys.map((key) => [key, true as const])) } })),
  remove: (key) =>
    set((state) => {
      const keys = { ...state.keys };
      delete keys[key];
      return { keys };
    }),
}));
