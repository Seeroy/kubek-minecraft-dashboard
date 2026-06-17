import { TaskStatus, TaskSteps } from "@shared/types/task.types";
import type { ServerCreationProgress } from "../../store/server-creation.store";

export type StageState = "pending" | "active" | "done" | "error";

export interface CreationStage {
  key: string;
  state: StageState;
  progress: number;
}

// Backend steps grouped into user-facing stages, in execution order
const STAGE_DEFS: { key: string; steps: TaskSteps[] }[] = [
  {
    key: "java",
    steps: [
      TaskSteps.CHECKING_JAVA,
      TaskSteps.DOWNLOADING_JAVA,
      TaskSteps.UNPACKING_JAVA,
    ],
  },
  {
    key: "core",
    steps: [
      TaskSteps.SEARCHING_CORE,
      TaskSteps.DOWNLOADING_CORE,
      TaskSteps.PULLING_IMAGE,
    ],
  },
  {
    key: "finalize",
    steps: [TaskSteps.CREATING_BAT, TaskSteps.COMPLETED],
  },
];

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Derive the ordered stage list progress */
export function computeCreationStages(
  creation: ServerCreationProgress
): CreationStage[] {
  const { status, step, progress } = creation;
  const isDoneAll =
    status === TaskStatus.SUCCESS || step === TaskSteps.COMPLETED;
  const isFailed =
    status === TaskStatus.FAILED || status === TaskStatus.CANCELLED;

  // Index of the stage owning the current step
  const matched = STAGE_DEFS.findIndex(
    (s) => step != null && s.steps.includes(step)
  );
  const current = matched === -1 ? 0 : matched;

  return STAGE_DEFS.map((def, idx) => {
    if (isDoneAll) return { key: def.key, state: "done", progress: 1 };
    if (idx < current) return { key: def.key, state: "done", progress: 1 };

    if (idx === current) {
      const local = clamp01((progress ?? 0) / 100);
      return {
        key: def.key,
        state: isFailed ? "error" : "active",
        progress: local,
      };
    }

    return { key: def.key, state: "pending", progress: 0 };
  });
}

/** Compact creation status used to render in-list progress (card / table row) */
export interface CreationStatusView {
  progress: number;
  message: string;
}

/** Overall completion across all creation stages, 0–100 */
export function creationOverallPercent(
  creation: ServerCreationProgress
): number {
  const stages = computeCreationStages(creation);
  if (stages.length === 0) return 0;
  const sum = stages.reduce((acc, s) => acc + s.progress, 0);
  return Math.round((sum / stages.length) * 100);
}
