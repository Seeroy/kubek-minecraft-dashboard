import { beforeEach, describe, expect, test } from "bun:test";
import { testUser } from "@/testing/user";
import { memoryDatabase, sqliteProvider } from "@/testing/sqlite";
import {
  ScheduledRunStatus,
  ScheduledRunTrigger,
  ScheduleMode,
  SchedulerActionType,
} from "@shared/types/scheduler.types";
import { ServerStatus } from "@shared/types/server/server.types";
import {
  type RunCreateInput,
  ScheduledTaskRunsRepository,
} from "./scheduled-task-runs.repository";
import { ScheduledTasksRepository } from "./scheduled-tasks.repository";
import { ServersRepository } from "./servers.repository";
import { UsersRepository } from "./users.repository";

let runs: ScheduledTaskRunsRepository;
let tasks: ScheduledTasksRepository;
let servers: ServersRepository;
let serverId: string;
let taskA: string;
let taskB: string;

const addServer = (name: string) =>
  servers.create({
    name,
    status: ServerStatus.STOPPED,
    restartOnError: { enabled: false, attempts: 0 },
    blueprintId: "paper",
    variables: {},
  }).id;

const addTask = (server: string, name: string) =>
  tasks.create({
    serverId: server,
    name,
    enabled: true,
    mode: ScheduleMode.CRON,
    cronExpression: null,
    runAt: null,
    timezone: null,
    schedulePayload: { mode: ScheduleMode.CRON, expression: "* * * * *" },
    action: SchedulerActionType.SERVER_START,
    actionPayload: { type: SchedulerActionType.SERVER_START },
    ownerId: "alice",
  }).id;

const run = (
  taskId: string,
  startedAt: number,
  status = ScheduledRunStatus.SUCCESS,
  extra: Partial<RunCreateInput> = {},
) =>
  runs.create({
    taskId,
    serverId,
    startedAt,
    finishedAt: null,
    durationMs: null,
    status,
    triggeredBy: ScheduledRunTrigger.CRON,
    output: null,
    error: null,
    ...extra,
  });

const starts = (list: { startedAt: number }[]) => list.map((r) => r.startedAt);

beforeEach(() => {
  const provider = sqliteProvider(memoryDatabase());
  runs = new ScheduledTaskRunsRepository(provider);
  tasks = new ScheduledTasksRepository(provider);
  servers = new ServersRepository(provider);
  new UsersRepository(provider).create(testUser("alice"));
  serverId = addServer("Lobby");
  taskA = addTask(serverId, "a");
  taskB = addTask(serverId, "b");
});

describe("ScheduledTaskRunsRepository", () => {
  test("a run reads back with the server of its task", () => {
    const created = run(taskA, 100, ScheduledRunStatus.FAILED, {
      finishedAt: 150,
      durationMs: 50,
      triggeredBy: ScheduledRunTrigger.MANUAL,
      output: "Done",
      error: "boom",
    });

    expect(runs.findById(created.id)).toEqual({
      id: created.id,
      taskId: taskA,
      serverId,
      startedAt: 100,
      finishedAt: 150,
      durationMs: 50,
      status: ScheduledRunStatus.FAILED,
      triggeredBy: ScheduledRunTrigger.MANUAL,
      output: "Done",
      error: "boom",
    });
  });

  test("the server comes from the task, not from the input", () => {
    const other = addServer("Other");
    const created = run(taskA, 1, ScheduledRunStatus.SUCCESS, {
      serverId: other,
    });
    expect(runs.findById(created.id)?.serverId).toBe(serverId);
  });

  test("runs of a task come newest first with paging", () => {
    for (const t of [10, 30, 20, 40]) run(taskA, t);
    run(taskB, 50);

    expect(starts(runs.findByTaskId(taskA))).toEqual([40, 30, 20, 10]);
    expect(starts(runs.findByTaskId(taskA, { limit: 2, offset: 1 }))).toEqual([
      30, 20,
    ]);
  });

  test("paging values out of range are clamped", () => {
    for (const t of [1, 2, 3]) run(taskA, t);
    expect(starts(runs.findByTaskId(taskA, { limit: 0, offset: -5 }))).toEqual([
      3,
    ]);
  });

  test("runs of a server can be filtered by task and status and counted", () => {
    run(taskA, 1, ScheduledRunStatus.SUCCESS);
    run(taskA, 2, ScheduledRunStatus.FAILED);
    run(taskB, 3, ScheduledRunStatus.FAILED);
    run(taskB, 4, ScheduledRunStatus.RUNNING);
    const elsewhere = addTask(addServer("Other"), "c");
    run(elsewhere, 5);

    expect(starts(runs.findByServerId(serverId))).toEqual([4, 3, 2, 1]);
    expect(starts(runs.findByServerId(serverId, { taskId: taskA }))).toEqual([
      2, 1,
    ]);
    expect(
      starts(
        runs.findByServerId(serverId, { status: ScheduledRunStatus.FAILED }),
      ),
    ).toEqual([3, 2]);
    expect(
      starts(
        runs.findByServerId(serverId, {
          taskId: taskB,
          status: ScheduledRunStatus.FAILED,
        }),
      ),
    ).toEqual([3]);
    expect(
      starts(runs.findByServerId(serverId, { limit: 1, offset: 1 })),
    ).toEqual([3]);

    expect(runs.countByServerId(serverId)).toBe(4);
    expect(
      runs.countByServerId(serverId, { status: ScheduledRunStatus.FAILED }),
    ).toBe(2);
    expect(runs.countByServerId(serverId, { taskId: taskB })).toBe(2);
    expect(runs.countByServerId("ghost")).toBe(0);
  });

  test("pruning keeps only the newest runs of that task", () => {
    for (const t of [10, 20, 30, 40, 50]) run(taskA, t);
    run(taskB, 5);

    expect(runs.pruneOlderThan(taskA, 2)).toBe(3);

    expect(starts(runs.findByTaskId(taskA))).toEqual([50, 40]);
    expect(starts(runs.findByTaskId(taskB))).toEqual([5]);
  });

  test("a run needs an existing task", () => {
    expect(() => run("ghost", 1)).toThrow("FOREIGN KEY constraint failed");
  });

  test("deleting the server removes the runs of its tasks", () => {
    run(taskA, 1);
    servers.delete(serverId);
    expect(runs.countByServerId(serverId)).toBe(0);
    expect(runs.findByTaskId(taskA)).toEqual([]);
  });
});
