import {
  type ITask,
  type TaskSteps,
  type TaskType,
  TaskStatus,
} from "@shared/types/task.types";
import { isTaskActive } from "@/shared/lib/task-status";
import { create } from "zustand";

/**
 * Live progress of a single server-creation task. Lives in a global store
 */
export interface ServerCreationProgress {
  taskId: string;
  type?: TaskType;
  serverId?: string;
  serverName: string;
  status: TaskStatus;
  step?: TaskSteps;
  progress: number;
  message?: string;
  error?: string;
  updatedAt: number;
  /** Distinct step and message pairs in arrival order, shown as a log */
  log: { step?: TaskSteps; message?: string }[];
}

interface ServerCreationState {
  creations: Record<string, ServerCreationProgress>;
  upsertFromTask: (task: ITask) => void;
  /** Tasks whose server starts once creation succeeds */
  autostart: Record<string, true>;
  setAutostart: (taskId: string, enabled: boolean) => void;
}

export const useServerCreationStore = create<ServerCreationState>((set) => ({
  creations: {},

  upsertFromTask: (task) =>
    set((state) => {
      const prev = state.creations[task.id];
      const log = prev?.log ?? [];
      const last = log.at(-1);
      const changed = !last || last.step !== task.step || last.message !== task.message;
      return {
        creations: {
          ...state.creations,
          [task.id]: {
            taskId: task.id,
            type: task.type,
            serverId: task.result?.serverId ?? task.meta?.serverId,
            serverName: task.meta?.serverName ?? prev?.serverName ?? "",
            status: task.status,
            step: task.step,
            progress: task.progress ?? 0,
            message: task.message,
            error: task.error?.message,
            updatedAt: Date.now(),
            log: changed ? [...log, { step: task.step, message: task.message }] : log,
          },
        },
      };
    }),

  autostart: {},

  setAutostart: (taskId, enabled) =>
    set((state) => {
      const next = { ...state.autostart };
      if (enabled) next[taskId] = true;
      else delete next[taskId];
      return { autostart: next };
    }),
}));

/** Most recent still-running creation, used to restore progress on modal reopen */
export function getLatestActiveCreation(): ServerCreationProgress | undefined {
  const { creations } = useServerCreationStore.getState();
  return Object.values(creations)
    .filter(isTaskActive)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
}
