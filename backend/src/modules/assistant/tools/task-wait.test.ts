import { describe, expect, it } from "bun:test";
import type { TasksService } from "@/modules/tasks/tasks.service";
import { type ITask, TaskStatus, TaskType } from "@shared/types/task.types";
import { awaitTask } from "./task-wait";

const task = (status: TaskStatus, extra: Partial<ITask> = {}): ITask =>
  ({ id: "t", type: TaskType.BACKUP_CREATE, status, ...extra }) as ITask;

const tasks = (waitFor: () => Promise<ITask>, current: ITask | null = null) =>
  ({ waitFor, getTask: () => current }) as unknown as TasksService;

describe("awaitTask", () => {
  it("reports success once the task ends", async () => {
    const result = await awaitTask(
      tasks(() => Promise.resolve(task(TaskStatus.SUCCESS, { message: "ok" }))),
      "t",
      "Backup",
    );
    expect(result).toEqual({ content: "Backup finished successfully: ok" });
  });

  it("marks a failed task as an error", async () => {
    const result = await awaitTask(
      tasks(() =>
        Promise.resolve(
          task(TaskStatus.FAILED, {
            error: { code: "X", message: "disk full" },
          }),
        ),
      ),
      "t",
      "Backup",
    );
    expect(result).toEqual({
      content: "Backup failed: disk full",
      isError: true,
    });
  });

  it("says it is still running when the wait runs out", async () => {
    const result = await awaitTask(
      tasks(() => new Promise<ITask>(() => {})),
      "t",
      "Backup",
      undefined,
      5,
    );
    expect(result.isError).toBeUndefined();
    expect(result.content).toContain("still running");
  });

  it("stops waiting when the chat is stopped", async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await awaitTask(
      tasks(() => new Promise<ITask>(() => {})),
      "t",
      "Backup",
      controller.signal,
    );
    expect(result.content).toContain("still running");
  });

  it("falls back to the stored task when it is no longer tracked", async () => {
    const result = await awaitTask(
      tasks(() => Promise.reject(new Error("gone")), task(TaskStatus.SUCCESS)),
      "t",
      "Install",
    );
    expect(result).toEqual({ content: "Install finished successfully" });
  });
});
