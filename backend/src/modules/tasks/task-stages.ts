import type { TaskStage } from "@shared/types/task.types";
import { TaskStatus } from "@shared/types/task.types";
import type { TasksService } from "./tasks.service";

export type StageSpec = Pick<TaskStage, "key" | "kind" | "name"> & {
  /** Share of the overall bar, 1 by default */
  weight?: number;
};

type StagePatch = Partial<
  Pick<TaskStage, "name" | "progress" | "step" | "bytes">
>;

// Byte counters fire per chunk, the socket only needs a few frames a second
const EMIT_EVERY_MS = 250;

/** Stages of one task, rolled up into its progress and sent with every update */
export class TaskStageTracker {
  private readonly stages: TaskStage[];
  private readonly weights = new Map<string, number>();
  private lastEmit = 0;

  constructor(
    private readonly tasks: TasksService,
    private readonly taskId: string,
    specs: StageSpec[],
  ) {
    this.stages = specs.map(({ weight, ...spec }) => {
      this.weights.set(spec.key, weight ?? 1);
      return { ...spec, status: "pending" };
    });
    this.emit();
  }

  start(key: string, patch: StagePatch = {}): void {
    this.patch(key, { ...patch, status: "running", progress: 0 });
    this.emit();
  }

  update(key: string, patch: StagePatch): void {
    this.patch(key, patch);
    if (Date.now() - this.lastEmit >= EMIT_EVERY_MS) this.emit();
  }

  done(key: string): void {
    this.patch(key, { status: "done", progress: 100 });
    this.emit();
  }

  /** Marks whatever was running as failed, the task error says why */
  failRunning(): void {
    for (const stage of this.stages) {
      if (stage.status === "running") stage.status = "failed";
    }
    this.emit();
  }

  private patch(key: string, patch: Partial<TaskStage>): void {
    const stage = this.stages.find((s) => s.key === key);
    if (stage) Object.assign(stage, patch);
  }

  private emit(): void {
    this.lastEmit = Date.now();
    let total = 0;
    let reached = 0;
    for (const stage of this.stages) {
      const weight = this.weights.get(stage.key) ?? 1;
      total += weight;
      if (stage.status === "done") reached += weight;
      else if (stage.status === "running")
        reached += (weight * (stage.progress ?? 0)) / 100;
    }
    this.tasks.updateTask(this.taskId, {
      status: TaskStatus.RUNNING,
      progress: total ? Math.round((reached / total) * 100) : 0,
      stages: this.stages.map((stage) => ({ ...stage })),
    });
  }
}
