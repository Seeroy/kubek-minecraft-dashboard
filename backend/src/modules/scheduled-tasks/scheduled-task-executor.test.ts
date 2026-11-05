import type { BackupCreatorService } from "@/modules/backups/backup-creator.service";
import type { CompanionService } from "@/modules/companion/companion.service";
import type { ScheduledTaskRunsRepository } from "@/modules/database/repositories/scheduled-task-runs.repository";
import type { UsersRepository } from "@/modules/database/repositories/users.repository";
import type { ServerInstance } from "@/modules/instances/instance";
import type { InstancesRegistry } from "@/modules/instances/instances.registry";
import type { TasksService } from "@/modules/tasks/tasks.service";
import { fake } from "@/testing/fake";
import { beforeEach, describe, expect, test } from "bun:test";
import {
  type IScheduledTask,
  type IScheduledTaskRun,
  ScheduledRunStatus,
  ScheduledRunTrigger,
  SchedulerActionType,
  type SchedulerActionPayload,
} from "@shared/types/scheduler.types";
import { ScheduledTaskExecutor } from "./scheduled-task-executor";
import type { WebhookClient } from "./webhook-client";

let restarted: number;
let countdowns: { seconds: number; message: string }[];
let companion: {
  connected: boolean;
  online: number | null;
  finishes: boolean;
};
let executor: ScheduledTaskExecutor;

function task(action: SchedulerActionPayload): IScheduledTask {
  return {
    id: "t1",
    serverId: "srv",
    ownerId: "admin",
    action: action.type,
    actionPayload: action,
  } as IScheduledTask;
}

beforeEach(() => {
  restarted = 0;
  countdowns = [];
  companion = { connected: true, online: 0, finishes: true };
  const instance = fake<ServerInstance>({
    restart: () => {
      restarted++;
      return Promise.resolve(true);
    },
    runtime: { playersOnline: 3 },
  });
  executor = new ScheduledTaskExecutor(
    fake<ScheduledTaskRunsRepository>({
      create: (run) => ({ id: "run", ...run }) as IScheduledTaskRun,
      pruneOlderThan: () => 0,
    }),
    fake<UsersRepository>({
      findById: () =>
        ({ id: "admin", username: "admin", isAdmin: true }) as never,
    }),
    fake<InstancesRegistry>({ getByServerId: () => instance }),
    fake<BackupCreatorService>(),
    fake<TasksService>(),
    fake<WebhookClient>(),
    fake<CompanionService>({
      isConnected: () => companion.connected,
      onlinePlayers: () => (companion.connected ? companion.online : null),
      countdown: (_id, seconds, message) => {
        countdowns.push({ seconds, message });
        return Promise.resolve(companion.finishes);
      },
    }),
  );
});

const run = (action: SchedulerActionPayload) =>
  executor.execute(task(action), ScheduledRunTrigger.MANUAL);

describe("stop and restart extras", () => {
  test("a plain restart just restarts", async () => {
    const result = await run({ type: SchedulerActionType.SERVER_RESTART });
    expect(result.status).toBe(ScheduledRunStatus.SUCCESS);
    expect(result.output).toBe("restarted");
    expect(restarted).toBe(1);
  });

  test("players online skip the run", async () => {
    companion.online = 2;
    const result = await run({
      type: SchedulerActionType.SERVER_RESTART,
      skipIfPlayersOnline: true,
    });
    expect(result.output).toBe("skipped, 2 players online");
    expect(restarted).toBe(0);
  });

  test("without the plugin the query count is used", async () => {
    companion.connected = false;
    const result = await run({
      type: SchedulerActionType.SERVER_RESTART,
      skipIfPlayersOnline: true,
    });
    expect(result.output).toBe("skipped, 3 players online");
  });

  test("countdown runs first with the default text", async () => {
    const result = await run({
      type: SchedulerActionType.SERVER_RESTART,
      countdownSec: 30,
    });
    expect(countdowns).toEqual([
      { seconds: 30, message: "&eServer restarts in {time}" },
    ]);
    expect(result.output).toBe("restarted");
  });

  test("a cancelled countdown skips the restart", async () => {
    companion.finishes = false;
    const result = await run({
      type: SchedulerActionType.SERVER_RESTART,
      countdownSec: 30,
    });
    expect(result.output).toBe("skipped, the countdown was cancelled");
    expect(restarted).toBe(0);
  });

  test("no plugin means no countdown, the restart still happens", async () => {
    companion.connected = false;
    const result = await run({
      type: SchedulerActionType.SERVER_RESTART,
      countdownSec: 30,
    });
    expect(countdowns).toEqual([]);
    expect(result.output).toBe(
      "restarted (no countdown, Kubek Companion is not connected)",
    );
  });
});
