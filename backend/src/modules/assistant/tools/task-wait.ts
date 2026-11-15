import type { TasksService } from "@/modules/tasks/tasks.service";
import { type ITask, TaskStatus } from "@shared/types/task.types";
import { failure, text } from "./tool-args";
import type { ToolResult } from "./tool.types";

const WAIT_LIMIT_MS = 15 * 60_000;

function stopped(signal: AbortSignal | undefined, limitMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const promise = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), limitMs);
    if (signal?.aborted) resolve(null);
    signal?.addEventListener("abort", () => resolve(null), { once: true });
  });
  return { promise, clear: () => clearTimeout(timer) };
}

/** Holds the tool call until its background task ends, so the model reports the real outcome */
export async function awaitTask(
  tasks: TasksService,
  taskId: string,
  label: string,
  signal?: AbortSignal,
  limitMs = WAIT_LIMIT_MS,
): Promise<ToolResult> {
  const stop = stopped(signal, limitMs);
  let task: ITask | null;
  try {
    task = await Promise.race([tasks.waitFor(taskId), stop.promise]);
  } catch {
    task = tasks.getTask(taskId);
  } finally {
    stop.clear();
  }

  if (!task || task.status === TaskStatus.PENDING || task.status === TaskStatus.RUNNING) {
    return text(`${label} is still running in the background (task ${taskId}), it is not finished yet`);
  }
  if (task.status === TaskStatus.SUCCESS) {
    return text(`${label} finished successfully${task.message ? `: ${task.message}` : ""}`);
  }
  return failure(`${label} ${task.status}: ${task.error?.message ?? task.message ?? "unknown error"}`);
}
