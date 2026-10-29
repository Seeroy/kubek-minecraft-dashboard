import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
} from "bun:test";
import { testUser } from "@/testing/user";
import { memoryDatabase, sqliteProvider } from "@/testing/sqlite";
import {
  IntervalUnit,
  ScheduledRunStatus,
  ScheduledRunTrigger,
  ScheduleMode,
  SchedulerActionType,
  SimpleScheduleKind,
} from "@shared/types/scheduler.types";
import { ServerStatus } from "@shared/types/server/server.types";
import {
  type ScheduledTaskCreate,
  ScheduledTasksRepository,
} from "./scheduled-tasks.repository";
import { ScheduledTaskRunsRepository } from "./scheduled-task-runs.repository";
import { ServersRepository } from "./servers.repository";
import { UsersRepository } from "./users.repository";

let tasks: ScheduledTasksRepository;
let runs: ScheduledTaskRunsRepository;
let users: UsersRepository;
let serverId: string;
let otherServerId: string;

const taskInput = (
  name: string,
  extra: Partial<ScheduledTaskCreate> = {},
): ScheduledTaskCreate => ({
  serverId,
  name,
  enabled: true,
  mode: ScheduleMode.CRON,
  cronExpression: null,
  runAt: null,
  timezone: null,
  schedulePayload: { mode: ScheduleMode.CRON, expression: "0 4 * * *" },
  action: SchedulerActionType.SERVER_RESTART,
  actionPayload: { type: SchedulerActionType.SERVER_RESTART },
  ownerId: "alice",
  ...extra,
});

const finishedRun = (
  taskId: string,
  startedAt: number,
  status: ScheduledRunStatus,
  error: string | null = null,
) =>
  runs.create({
    taskId,
    serverId,
    startedAt,
    finishedAt: status === ScheduledRunStatus.RUNNING ? null : startedAt + 5,
    durationMs: status === ScheduledRunStatus.RUNNING ? null : 5,
    status,
    triggeredBy: ScheduledRunTrigger.CRON,
    output: null,
    error,
  });

beforeEach(() => {
  setSystemTime(new Date(1_000_000));
  const provider = sqliteProvider(memoryDatabase());
  tasks = new ScheduledTasksRepository(provider);
  runs = new ScheduledTaskRunsRepository(provider);
  users = new UsersRepository(provider);
  const servers = new ServersRepository(provider);
  users.create(testUser("alice"));
  const server = (name: string) =>
    servers.create({
      name,
      status: ServerStatus.STOPPED,
      restartOnError: { enabled: false, attempts: 0 },
      blueprintId: "paper",
      variables: {},
    }).id;
  serverId = server("Lobby");
  otherServerId = server("Survival");
});

afterEach(() => {
  setSystemTime();
});

describe("ScheduledTasksRepository", () => {
  test("a cron task reads back with its payloads and no runs yet", () => {
    const created = tasks.create(
      taskInput("say hi", {
        timezone: "Europe/Moscow",
        action: SchedulerActionType.SERVER_COMMAND,
        actionPayload: {
          type: SchedulerActionType.SERVER_COMMAND,
          command: "say hi",
        },
      }),
    );

    expect(tasks.findById(created.id)).toEqual({
      id: created.id,
      serverId,
      name: "say hi",
      enabled: true,
      mode: ScheduleMode.CRON,
      cronExpression: "0 4 * * *",
      runAt: null,
      timezone: "Europe/Moscow",
      schedulePayload: { mode: ScheduleMode.CRON, expression: "0 4 * * *" },
      action: SchedulerActionType.SERVER_COMMAND,
      actionPayload: {
        type: SchedulerActionType.SERVER_COMMAND,
        command: "say hi",
      },
      ownerId: "alice",
      createdAt: 1_000_000,
      updatedAt: 1_000_000,
      lastRunAt: null,
      lastRunStatus: null,
      lastRunError: null,
    });
  });

  test("the cron of a simple schedule is derived from the form", () => {
    const created = tasks.create(
      taskInput("every 15", {
        mode: ScheduleMode.SIMPLE,
        schedulePayload: {
          mode: ScheduleMode.SIMPLE,
          kind: SimpleScheduleKind.INTERVAL,
          intervalValue: 15,
          intervalUnit: IntervalUnit.MINUTES,
        },
      }),
    );
    expect(created.cronExpression).toBe("*/15 * * * *");
    expect(created.schedulePayload).toEqual({
      mode: ScheduleMode.SIMPLE,
      kind: SimpleScheduleKind.INTERVAL,
      intervalValue: 15,
      intervalUnit: IntervalUnit.MINUTES,
    });
  });

  test("a one time task has a run time and no cron", () => {
    const created = tasks.create(
      taskInput("once", {
        mode: ScheduleMode.ONCE,
        schedulePayload: {
          mode: ScheduleMode.ONCE,
          isoDateTime: "2026-01-02T03:04:05.000Z",
        },
      }),
    );
    expect(created.cronExpression).toBeNull();
    expect(created.runAt).toBe(Date.parse("2026-01-02T03:04:05.000Z"));
  });

  test("the mode column wins over a stale mode inside the payload", () => {
    const created = tasks.create(taskInput("t"));
    const stored = tasks.update(created.id, {
      mode: ScheduleMode.ONCE,
      schedulePayload: {
        mode: ScheduleMode.ONCE,
        isoDateTime: "2026-05-01T00:00:00.000Z",
      },
    });
    expect(stored?.schedulePayload).toEqual({
      mode: ScheduleMode.ONCE,
      isoDateTime: "2026-05-01T00:00:00.000Z",
    });
    expect(stored?.cronExpression).toBeNull();
  });

  test("the last run is the newest finished one, running runs are ignored", () => {
    const task = tasks.create(taskInput("t"));
    finishedRun(task.id, 100, ScheduledRunStatus.SUCCESS);
    finishedRun(task.id, 200, ScheduledRunStatus.FAILED, "server offline");
    finishedRun(task.id, 300, ScheduledRunStatus.RUNNING);

    expect(tasks.findById(task.id)).toMatchObject({
      lastRunAt: 205,
      lastRunStatus: ScheduledRunStatus.FAILED,
      lastRunError: "server offline",
    });
  });

  test("lists newest first, per server, and only enabled ones on request", () => {
    const first = tasks.create(taskInput("first"));
    setSystemTime(new Date(2_000_000));
    const second = tasks.create(taskInput("second", { enabled: false }));
    setSystemTime(new Date(3_000_000));
    const other = tasks.create(taskInput("other", { serverId: otherServerId }));

    expect(tasks.findAll().map((t) => t.id)).toEqual([
      other.id,
      second.id,
      first.id,
    ]);
    expect(tasks.findByServerId(serverId).map((t) => t.id)).toEqual([
      second.id,
      first.id,
    ]);
    expect(
      tasks
        .findEnabled()
        .map((t) => t.id)
        .sort(),
    ).toEqual([first.id, other.id].sort());
  });

  test("update merges fields and bumps updatedAt", () => {
    const created = tasks.create(taskInput("t"));
    setSystemTime(new Date(1_500_000));

    const updated = tasks.update(created.id, {
      enabled: false,
      name: "renamed",
    });

    expect(updated).toEqual({
      ...created,
      enabled: false,
      name: "renamed",
      updatedAt: 1_500_000,
    });
    expect(tasks.update("nope", { enabled: false })).toBeNull();
  });

  test("deleting a task removes its runs", () => {
    const task = tasks.create(taskInput("t"));
    const run = finishedRun(task.id, 100, ScheduledRunStatus.SUCCESS);

    expect(tasks.delete(task.id)).toBe(true);
    expect(tasks.delete(task.id)).toBe(false);
    expect(runs.findById(run.id)).toBeNull();
  });

  test("deleting the owner removes their tasks", () => {
    tasks.create(taskInput("t"));
    users.delete("alice");
    expect(tasks.findAll()).toEqual([]);
  });

  test("a task needs an existing server and owner", () => {
    expect(() => tasks.create(taskInput("t", { serverId: "ghost" }))).toThrow(
      "FOREIGN KEY constraint failed",
    );
    expect(() => tasks.create(taskInput("t", { ownerId: "ghost" }))).toThrow(
      "FOREIGN KEY constraint failed",
    );
  });
});
