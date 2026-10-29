import { TaskStatus, TaskSteps, TaskType } from "@shared/types/task.types";
import type { ServerCreationProgress } from "../../store/server-creation.store";

export type StageState = "pending" | "active" | "done" | "error";

export interface CreationStage {
  key: string;
  state: StageState;
  progress: number;
}

// Backend steps grouped into user-facing stages, in execution order
type StageDef = { key: string; steps: TaskSteps[] };

const BASE_STAGES: StageDef[] = [
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
];

const FINALIZE_STAGE: StageDef = {
  key: "finalize",
  steps: [TaskSteps.CREATING_BAT, TaskSteps.COMPLETED],
};

// Modpacks add their own work between the core and the final touches
const MODPACK_STAGES: StageDef[] = [
  { key: "mods", steps: [TaskSteps.DOWNLOADING_MODS] },
  {
    key: "overrides",
    steps: [TaskSteps.APPLYING_OVERRIDES, TaskSteps.REGISTERING_CONTENT],
  },
];

function stageDefs(type: TaskType | undefined): StageDef[] {
  return type === TaskType.SERVER_CREATE_MODPACK
    ? [...BASE_STAGES, ...MODPACK_STAGES, FINALIZE_STAGE]
    : [...BASE_STAGES, FINALIZE_STAGE];
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Derive the ordered stage list progress */
export function computeCreationStages(
  creation: ServerCreationProgress
): CreationStage[] {
  const { status, step, progress } = creation;
  const defs = stageDefs(creation.type);
  const isDoneAll =
    status === TaskStatus.SUCCESS || step === TaskSteps.COMPLETED;
  const isFailed =
    status === TaskStatus.FAILED || status === TaskStatus.CANCELLED;

  // Index of the stage owning the current step
  const matched = defs.findIndex(
    (s) => step != null && s.steps.includes(step)
  );
  const current = matched === -1 ? 0 : matched;

  return defs.map((def, idx) => {
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

/** Overall completion across all creation stages, 0-100 */
export function creationOverallPercent(
  creation: ServerCreationProgress
): number {
  const stages = computeCreationStages(creation);
  if (stages.length === 0) return 0;
  const sum = stages.reduce((acc, s) => acc + s.progress, 0);
  return Math.round((sum / stages.length) * 100);
}
