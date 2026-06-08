import type { TaskEntity } from "@/api/tasks";
import type {
  ITask,
  TaskMeta,
  TaskStatus,
  TaskSteps,
  TaskType,
} from "@shared/types/task.types";

// Bridge the API TaskEntity into the enum-rich domain ITask at the data boundary
export function toTask(entity: TaskEntity): ITask {
  return {
    ...entity,
    type: entity.type as TaskType,
    status: entity.status as TaskStatus,
    step: entity.step as TaskSteps | undefined,
    meta: entity.meta as TaskMeta | undefined,
    error: entity.error as ITask["error"],
  };
}
