import { describe, expect, test } from "bun:test";
import { NotFoundException } from "@nestjs/common";
import type {
  IScheduledTask,
  IScheduledTaskRun,
} from "@shared/types/scheduler.types";
import { userWith } from "@/testing/user";
import { AccessArea } from "@shared/access/areas";
import type { Request } from "express";
import { fake } from "@/testing/fake";
import { ScheduledTasksController } from "./scheduled-tasks.controller";
import type { ScheduledTasksService } from "./scheduled-tasks.service";

const tasks: Record<string, IScheduledTask> = {
  own: fake<IScheduledTask>({ id: "own", serverId: "mine", enabled: true }),
  other: fake<IScheduledTask>({
    id: "other",
    serverId: "foreign",
    enabled: true,
  }),
};

const calls: string[] = [];
const service = fake<ScheduledTasksService>({
  findById: (id: string) => {
    const task = tasks[id];
    if (!task) throw new NotFoundException("Scheduled task not found");
    return task;
  },
  update: (id: string) => (calls.push(`update:${id}`), tasks[id]),
  delete: (id: string) => calls.push(`delete:${id}`),
  toggle: (id: string) => (calls.push(`toggle:${id}`), tasks[id]),
  runNow: (id: string) => (
    calls.push(`run:${id}`),
    Promise.resolve(fake<IScheduledTaskRun>())
  ),
  listTaskRuns: (id: string) => (calls.push(`runs:${id}`), []),
});

const controller = new ScheduledTasksController(service);
const req = fake<Request>();
const user = userWith(
  { [AccessArea.SCHEDULER]: "manage" },
  { serversRestrict: { enabled: true, allowed: ["mine"] } },
);

describe("scheduled tasks by id", () => {
  test("tasks of foreign servers look missing", () => {
    calls.length = 0;
    expect(() => controller.get("other", user)).toThrow(NotFoundException);
    expect(() => controller.update("other", {}, user, req)).toThrow(
      NotFoundException,
    );
    expect(() => controller.delete("other", user, req)).toThrow(
      NotFoundException,
    );
    expect(() => controller.toggle("other", user, req)).toThrow(
      NotFoundException,
    );
    expect(() => controller.runNow("other", user, req)).toThrow(
      NotFoundException,
    );
    expect(() => controller.taskRuns("other", user)).toThrow(NotFoundException);
    expect(calls).toEqual([]);
  });

  test("own tasks keep working", async () => {
    calls.length = 0;
    expect(controller.get("own", user).id).toBe("own");
    controller.update("own", {}, user, req);
    controller.toggle("own", user, req);
    await controller.runNow("own", user, req);
    controller.taskRuns("own", user);
    controller.delete("own", user, req);
    expect(calls).toEqual([
      "update:own",
      "toggle:own",
      "run:own",
      "runs:own",
      "delete:own",
    ]);
  });
});
