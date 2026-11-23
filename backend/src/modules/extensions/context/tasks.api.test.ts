import { describe, expect, it } from "bun:test";
import { TasksService } from "@/modules/tasks/tasks.service";
import { TaskStatus, TaskType } from "@shared/types/task.types";
import { extActor } from "./ext-audit";
import { createTasksApi } from "./tasks.api";

function setup() {
  const published: { event: string; payload: any }[] = [];
  const tasks = new TasksService(
    {
      emitTaskUpdate: () => {},
      emitTaskDone: () => {},
      emitTaskFailed: () => {},
    } as never,
    {
      publish: (event: string, payload: unknown) =>
        published.push({ event, payload }),
    } as never,
    { emit: () => {} } as never,
  );
  const api = createTasksApi(tasks, { id: "com.a.ext", name: "Ext" }, (id) =>
    id === "s1" ? "Survival" : undefined,
  );
  return { tasks, api, published };
}

describe("ctx.tasks", () => {
  it("creates a running panel task with the extension in meta", () => {
    const { tasks, api, published } = setup();
    const id = api.create("sync", { title: "Syncing maps", serverId: "s1" });
    expect(tasks.getTask(id)).toMatchObject({
      type: TaskType.EXTENSION,
      status: TaskStatus.RUNNING,
      meta: {
        extensionId: "com.a.ext",
        extensionName: "Ext",
        extensionTask: "sync",
        title: "Syncing maps",
        serverId: "s1",
        serverName: "Survival",
      },
    });
    expect(published[0]).toEqual({
      event: "task.created",
      payload: { taskId: id, type: TaskType.EXTENSION },
    });
  });

  it("belongs to the user who started it from a route", () => {
    const { tasks, api } = setup();
    const id = extActor.run(
      { userId: "u1", username: "alex", ip: null, userAgent: null },
      () => api.create("sync", null),
    );
    expect(tasks.getTask(id)?.ownerId).toBe("u1");
  });

  it("maps progress and the final status", () => {
    const { tasks, api, published } = setup();
    const id = api.create("sync", null);
    api.update(id, { progress: 140.4, message: "almost" });
    expect(tasks.getTask(id)).toMatchObject({ progress: 100, message: "almost" });
    api.update(id, { progress: 42.6 });
    expect(tasks.getTask(id)?.progress).toBe(43);
    api.update(id, { status: "success" });
    expect(tasks.getTask(id)).toMatchObject({ status: TaskStatus.SUCCESS, progress: 100 });
    expect(published.at(-1)?.event).toBe("task.completed");
  });

  it("a failed status carries the message as the error", () => {
    const { tasks, api } = setup();
    const id = api.create("sync", null);
    api.update(id, { status: "failed", message: "no space" });
    expect(tasks.getTask(id)).toMatchObject({
      status: TaskStatus.FAILED,
      error: { message: "no space" },
    });
  });

  it("cancelled and unknown statuses", () => {
    const { tasks, api } = setup();
    const id = api.create("sync", null);
    api.update(id, { status: "weird", progress: 10 });
    expect(tasks.getTask(id)).toMatchObject({ status: TaskStatus.RUNNING, progress: 10 });
    api.update(id, { status: "cancelled" });
    expect(tasks.getTask(id)?.status).toBe(TaskStatus.CANCELLED);
  });

  it("cannot touch tasks of the panel or other extensions", () => {
    const { tasks, api } = setup();
    const core = tasks.createTask(TaskType.BACKUP_CREATE);
    expect(() => api.update(core, { status: "failed" })).toThrow("Unknown task");
    const other = createTasksApi(tasks, { id: "com.b.ext", name: "B" }).create("x", null);
    expect(() => api.update(other, { progress: 1 })).toThrow("Unknown task");
    expect(() => api.update("nope", { progress: 1 })).toThrow("Unknown task");
  });
});
