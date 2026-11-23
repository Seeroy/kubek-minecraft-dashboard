import { describe, expect, it } from "bun:test";
import { TaskStatus, TaskType } from "@shared/types/task.types";
import { TasksService } from "./tasks.service";

function setup() {
  const updates: TaskStatus[] = [];
  const finished: string[] = [];
  const published: unknown[] = [];
  const tasks = new TasksService(
    {
      emitTaskUpdate: (task: { status: TaskStatus }) =>
        updates.push(task.status),
      emitTaskDone: () => {},
      emitTaskFailed: () => {},
    } as never,
    {
      publish: (event: string, payload: unknown) =>
        published.push({ event, payload }),
    } as never,
    { emit: (name: string) => finished.push(name) } as never,
  );
  return { tasks, updates, finished, published };
}

describe("TasksService", () => {
  it("tells extensions about cancelled tasks too", () => {
    const { tasks, published } = setup();
    const id = tasks.createTask(TaskType.BACKUP_CREATE, { serverId: "s1" });
    tasks.updateTask(id, { status: TaskStatus.CANCELLED });
    expect(published.at(-1)).toEqual({
      event: "task.completed",
      payload: { taskId: id, status: "cancelled", result: { serverId: "s1" } },
    });
  });

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
