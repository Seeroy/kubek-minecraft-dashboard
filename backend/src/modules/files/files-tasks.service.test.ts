import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { TaskErrorCode } from "@/core/errors/error-codes";
import type { AppEventsService } from "@/core/events/app-events.service";
import type { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import { TasksService } from "@/modules/tasks/tasks.service";
import { fake } from "@/testing/fake";
import type { TasksEventsService } from "@/ws/services/task-events.service";
import { TaskStatus, TaskType } from "@shared/types/task.types";
import { FileBatchService } from "./file-batch.service";
import { FilesTasksService } from "./files-tasks.service";

let cwd: string;
let root: string;
let server: string;
let tasks: TasksService;
let service: FilesTasksService;

function put(relative: string, content = "x") {
  const full = join(server, relative);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

beforeEach(() => {
  cwd = process.cwd();
  root = realpathSync(mkdtempSync(join(tmpdir(), "kubek-files-tasks-")));
  process.chdir(root);
  server = join(root, "servers", "srv");
  mkdirSync(server, { recursive: true });

  const bus = fake<ExtensionEventBus>({ publish: () => {} });
  tasks = new TasksService(
    fake<TasksEventsService>({
      emitTaskUpdate: () => {},
      emitTaskDone: () => {},
      emitTaskFailed: () => {},
    }),
    bus,
    fake<AppEventsService>({ emit: () => {} }),
  );
  service = new FilesTasksService(tasks, new FileBatchService());
});

afterEach(() => {
  process.chdir(cwd);
  rmSync(root, { recursive: true, force: true });
});

describe("FilesTasksService", () => {
  test("a delete task starts running and finishes once the files are gone", async () => {
    put("a.txt");
    put("world/level.dat");

    const { task } = await service.deletePathsTask(
      "srv",
      ["a.txt", "world"],
      "owner",
    );

    expect(task.type).toBe(TaskType.FILES_DELETE);
    expect(task.status).toBe(TaskStatus.RUNNING);
    expect(task.ownerId).toBe("owner");
    expect<unknown>(task.meta).toEqual({ serverId: "srv", count: 2 });

    const done = await tasks.waitFor(task.id);
    expect(done.status).toBe(TaskStatus.SUCCESS);
    expect(done.progress).toBe(100);
    expect(readdirSync(server)).toEqual([]);
  });

  test("a delete task that misses a file fails with the summary", async () => {
    put("a.txt");
    const { task } = await service.deletePathsTask(
      "srv",
      ["a.txt", "ghost.txt"],
      "owner",
    );

    const done = await tasks.waitFor(task.id);
    expect(done.status).toBe(TaskStatus.FAILED);
    expect(done.error).toEqual({
      code: TaskErrorCode.TASK_ERROR,
      message: "Failed to delete 1/2: ghost.txt (not found)",
    });
    expect(existsSync(join(server, "a.txt"))).toBe(false);
  });

  test("archive and extract tasks hand back the paths they produced", async () => {
    put("plugins/a.yml", "a: 1");

    const archive = await service.createArchiveTask(
      "srv",
      ["plugins"],
      "",
      "plugins-backup",
      "owner",
    );
    expect<unknown>(archive.task.meta).toEqual({
      serverId: "srv",
      count: 1,
      archiveName: "plugins-backup",
    });
    const archived = await tasks.waitFor(archive.task.id);
    expect(archived.status).toBe(TaskStatus.SUCCESS);
    expect(archived.result).toEqual({ archivePath: "plugins-backup.zip" });

    rmSync(join(server, "plugins"), { recursive: true });
    const extract = await service.extractArchiveTask(
      "srv",
      "plugins-backup.zip",
      "owner",
    );
    const extracted = await tasks.waitFor(extract.task.id);
    expect(extracted.status).toBe(TaskStatus.SUCCESS);
    expect(extracted.result).toEqual({ extractPath: "" });
    expect(readFileSync(join(server, "plugins", "a.yml"), "utf8")).toBe("a: 1");
  });

  test("a failed extract ends the task with the error message", async () => {
    put("notes.txt");
    const { task } = await service.extractArchiveTask(
      "srv",
      "notes.txt",
      "owner",
    );
    const done = await tasks.waitFor(task.id);
    expect(done.status).toBe(TaskStatus.FAILED);
    expect(done.error?.message).toBe("Only .zip archives can be extracted");
  });
});
