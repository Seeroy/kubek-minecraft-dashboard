import { describe, expect, test } from "bun:test";
import {
  type IScheduledTask,
  IntervalUnit,
  ScheduleMode,
  SchedulerActionType,
  SimpleScheduleKind,
} from "@shared/types/scheduler.types";
import type { CreateScheduledTaskDto } from "./dto/scheduled-task.dto";
import {
  normalizeAction,
  normalizeSchedule,
  computeNextRun,
  mergeForUpdate,
} from "./schedule-normalizer";

const NOW = Date.parse("2026-10-25T12:00:00.000Z");

function task(overrides: Partial<IScheduledTask> = {}): IScheduledTask {
  return {
    id: "t1",
    serverId: "s1",
    name: "nightly",
    enabled: true,
    mode: ScheduleMode.CRON,
    cronExpression: "0 3 * * *",
    runAt: null,
    timezone: null,
    schedulePayload: { mode: ScheduleMode.CRON, expression: "0 3 * * *" },
    action: SchedulerActionType.SERVER_RESTART,
    actionPayload: { type: SchedulerActionType.SERVER_RESTART },
    ownerId: "u1",
    createdAt: 0,
    updatedAt: 0,
    lastRunAt: null,
    lastRunStatus: null,
    lastRunError: null,
    ...overrides,
  };
}

const message = (fn: () => unknown) => {
  try {
    fn();
    return null;
  } catch (error) {
    return (error as Error).message;
  }
};

describe("normalizeSchedule", () => {
  test("turns a simple interval into cron and keeps the payload", () => {
    expect(
      normalizeSchedule({
        mode: ScheduleMode.SIMPLE,
        simple: {
          kind: SimpleScheduleKind.INTERVAL,
          intervalValue: 15,
          intervalUnit: IntervalUnit.MINUTES,
        },
      }),
    ).toEqual({
      cronExpression: "*/15 * * * *",
      runAt: null,
      schedulePayload: {
        mode: ScheduleMode.SIMPLE,
        kind: SimpleScheduleKind.INTERVAL,
        intervalValue: 15,
        intervalUnit: IntervalUnit.MINUTES,
      },
    });
  });

  test("validates cron expressions", () => {
    expect(
      message(() =>
        normalizeSchedule({
          mode: ScheduleMode.CRON,
          cron: { expression: "not a cron" },
        }),
      ),
    ).toContain("Invalid cron expression");
  });

  test("once needs a future date", () => {
    const once = (isoDateTime: string) =>
      normalizeSchedule(
        { mode: ScheduleMode.ONCE, once: { isoDateTime } },
        NOW,
      );
    expect(once("2026-10-26T00:00:00.000Z").runAt).toBe(
      Date.parse("2026-10-26T00:00:00.000Z"),
    );
    expect(message(() => once("2026-10-24T00:00:00.000Z"))).toContain(
      "in the future",
    );
    expect(message(() => once("garbage"))).toContain("invalid");
  });

  test("requires the payload of the chosen mode", () => {
    expect(
      message(() => normalizeSchedule({ mode: ScheduleMode.CRON })),
    ).toContain("cron payload is required");
  });
});

describe("normalizeAction", () => {
  test("drops fields the action does not use", () => {
    const action = {
      type: SchedulerActionType.SERVER_START,
      command: "leftover",
    } as CreateScheduledTaskDto["action"];
    expect(normalizeAction(action)).toEqual({
      type: SchedulerActionType.SERVER_START,
    });
  });

  test("checks required fields", () => {
    expect(
      message(() =>
        normalizeAction({
          type: SchedulerActionType.SERVER_COMMAND,
        } as CreateScheduledTaskDto["action"]),
      ),
    ).toBe("command is required");
  });
});

describe("mergeForUpdate", () => {
  test("touches only the fields sent", () => {
    expect(mergeForUpdate(task(), { name: "  renamed " })).toEqual({
      name: "renamed",
    });
  });

  test("reuses the stored expression while the mode stays", () => {
    const merged = mergeForUpdate(task(), {
      mode: ScheduleMode.CRON,
      timezone: "Europe/Moscow",
    });
    expect(merged.cronExpression).toBe("0 3 * * *");
    expect(merged.timezone).toBe("Europe/Moscow");
  });

  test("switching mode needs the new payload", () => {
    expect(
      message(() => mergeForUpdate(task(), { mode: ScheduleMode.ONCE }, NOW)),
    ).toContain("once payload is required");
  });

  test("switching to once computes runAt", () => {
    const merged = mergeForUpdate(
      task(),
      {
        mode: ScheduleMode.ONCE,
        once: { isoDateTime: "2026-11-01T10:00:00.000Z" },
      },
      NOW,
    );
    expect(merged.mode).toBe(ScheduleMode.ONCE);
    expect(merged.cronExpression).toBeNull();
    expect(merged.runAt).toBe(Date.parse("2026-11-01T10:00:00.000Z"));
  });
});

describe("computeNextRun", () => {
  test("is null for disabled and past one-shot tasks", () => {
    expect(computeNextRun(task({ enabled: false }))).toBeNull();
    expect(
      computeNextRun(task({ mode: ScheduleMode.ONCE, runAt: NOW - 1 }), NOW),
    ).toBeNull();
  });

  test("returns the next cron fire", () => {
    expect(computeNextRun(task())).toBeGreaterThan(Date.now());
  });
});
