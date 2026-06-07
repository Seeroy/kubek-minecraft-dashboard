import {
  type ITask,
  type TaskSteps,
  TaskStatus,
} from "@shared/types/task.types";
import { create } from "zustand";

/**
 * Live progress of a single server-creation task. Lives in a global store
 */
export interface ServerCreationProgress {
  taskId: string;
  serverId?: string;
  serverName: string;
  status: TaskStatus;
  step?: TaskSteps;
  progress: number;
  message?: string;
  error?: string;
  updatedAt: number;
}

interface ServerCreationState {
  creations: Record<string, ServerCreationProgress>;
  upsertFromTask: (task: ITask) => void;
  clear: (taskId: string) => void;
}

export const useServerCreationStore = create<ServerCreationState>((set) => ({
  creations: {},

  upsertFromTask: (task) =>
    set((state) => ({
      creations: {
        ...state.creations,
        [task.id]: {
          taskId: task.id,
          serverId: task.result?.serverId ?? task.meta?.serverId,
          serverName:
            task.meta?.serverName ?? state.creations[task.id]?.serverName ?? "",
          status: task.status,
          step: task.step,
          progress: task.progress ?? 0,
          message: task.message,
          error: task.error?.message,
          updatedAt: Date.now(),
        },
      },
    })),

  clear: (taskId) =>
    set((state) => {
      if (!state.creations[taskId]) return state;
      const next = { ...state.creations };
      delete next[taskId];
      return { creations: next };
    }),
}));

/** Most recent still-running creation, used to restore progress on modal reopen */
export function getLatestActiveCreation(): ServerCreationProgress | undefined {
  const { creations } = useServerCreationStore.getState();
  return Object.values(creations)
    .filter(
      (c) => c.status === TaskStatus.PENDING || c.status === TaskStatus.RUNNING
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
}
