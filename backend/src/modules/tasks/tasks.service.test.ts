import { describe, expect, it } from "bun:test";
import { TaskStatus, TaskType } from "@shared/types/task.types";
import { TasksService } from "./tasks.service";

function setup() {
  const updates: TaskStatus[] = [];
  const finished: string[] = [];
  const tasks = new TasksService(
    {
      emitTaskUpdate: (task: { status: TaskStatus }) =>
        updates.push(task.status),
      emitTaskDone: () => {},
      emitTaskFailed: () => {},
    } as never,
    { publish: () => {} } as never,
    { emit: (name: string) => finished.push(name) } as never,
  );
  return { tasks, updates, finished };
}

describe("TasksService", () => {
  it("ignores late updates once a task has finished", () => {
    const { tasks, updates, finished } = setup();
    const id = tasks.createTask(TaskType.BACKUP_CREATE);
    tasks.updateTask(id, { status: TaskStatus.FAILED });
    // Progress from work that kept running after the failure
    tasks.updateTask(id, { progress: 40, message: "Creating archive..." });

    expect(tasks.getTask(id)?.status).toBe(TaskStatus.FAILED);
    expect(tasks.getTask(id)?.progress).toBe(0);
    expect(updates).toEqual([TaskStatus.PENDING, TaskStatus.FAILED]);
    expect(finished).toEqual(["task.finished"]);
  });

  it("keeps updating a running task", () => {
    const { tasks } = setup();
    const id = tasks.createTask(TaskType.BACKUP_CREATE);
    tasks.updateTask(id, { status: TaskStatus.RUNNING, progress: 10 });
    tasks.updateTask(id, { progress: 50 });
    expect(tasks.getTask(id)?.progress).toBe(50);
  });
});
