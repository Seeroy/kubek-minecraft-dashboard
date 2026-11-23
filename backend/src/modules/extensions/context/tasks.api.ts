import { TaskErrorCode } from "@/core/errors/error-codes";
import type { TasksService } from "@/modules/tasks/tasks.service";
import type { ExtTasksApi } from "@kubekpanel/extension-sdk";
import {
  type ITask,
  type TaskMeta,
  TaskStatus,
  TaskType,
} from "@shared/types/task.types";
import { extActor } from "./ext-audit";

const STATUS: Record<string, TaskStatus> = {
  pending: TaskStatus.PENDING,
  running: TaskStatus.RUNNING,
  success: TaskStatus.SUCCESS,
  completed: TaskStatus.SUCCESS,
  done: TaskStatus.SUCCESS,
  failed: TaskStatus.FAILED,
  error: TaskStatus.FAILED,
  cancelled: TaskStatus.CANCELLED,
  canceled: TaskStatus.CANCELLED,
};

/** Extension work shows up as a regular panel task of type extension.task */
export function createTasksApi(
  tasks: Pick<TasksService, "createTask" | "updateTask" | "getTask">,
  ext: { id: string; name: string },
  serverName: (serverId: string) => string | undefined = () => undefined,
): ExtTasksApi {
  return {
    create: (type, payload) => {
      const p = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
      const meta: TaskMeta = {
        extensionId: ext.id,
        extensionName: ext.name,
        extensionTask: String(type),
      };
      if (typeof p.title === "string" && p.title) meta.title = p.title;
      if (typeof p.serverId === "string" && p.serverId) {
        meta.serverId = p.serverId;
        meta.serverName = serverName(p.serverId);
      }
      // Started from a route or a command the user who clicked owns it
      const id = tasks.createTask(TaskType.EXTENSION, meta, extActor.getStore()?.userId);
      tasks.updateTask(id, { status: TaskStatus.RUNNING });
      return id;
    },
    update: (taskId, patch) => {
      const task = tasks.getTask(taskId);
      if (!task || task.meta?.extensionId !== ext.id)
        throw new Error(`Unknown task ${taskId}`);
      const data: Partial<ITask> = {};
      if (typeof patch?.message === "string") data.message = patch.message;
      if (typeof patch?.progress === "number" && Number.isFinite(patch.progress))
        data.progress = Math.max(0, Math.min(100, Math.round(patch.progress)));
      const status =
        typeof patch?.status === "string" ? STATUS[patch.status.toLowerCase()] : undefined;
      if (status) data.status = status;
      if (status === TaskStatus.SUCCESS) data.progress = 100;
      if (status === TaskStatus.FAILED)
        data.error = {
          code: TaskErrorCode.TASK_ERROR,
          message: patch.message ?? "Failed",
        };
      tasks.updateTask(taskId, data);
    },
  };
}
