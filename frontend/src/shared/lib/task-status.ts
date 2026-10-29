import { type ITask, TaskStatus } from "@shared/types/task.types";

type WithStatus = Pick<ITask, "status"> | null | undefined;

const ACTIVE = new Set([TaskStatus.PENDING, TaskStatus.RUNNING]);
const FINISHED = new Set([TaskStatus.SUCCESS, TaskStatus.FAILED, TaskStatus.CANCELLED]);

/** Queued or running */
export const isTaskActive = (task: WithStatus) => !!task && ACTIVE.has(task.status);

/** Succeeded, failed or cancelled */
export const isTaskFinished = (task: WithStatus) => !!task && FINISHED.has(task.status);
