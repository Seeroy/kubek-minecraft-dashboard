import { describe, expect, test } from "bun:test";
import { AccessArea } from "@shared/access/areas";
import { SchedulerActionType } from "@shared/types/scheduler.types";
import { userWith } from "@/testing/user";
import { canRunAction } from "./action-access";

const scheduler = { [AccessArea.SCHEDULER]: "write" } as const;

describe("scheduled actions", () => {
  test("a command needs console write on top of the scheduler", () => {
    const viewer = userWith({ ...scheduler, [AccessArea.CONSOLE]: "read" });
    const operator = userWith({ ...scheduler, [AccessArea.CONSOLE]: "write" });

    expect(canRunAction(viewer, SchedulerActionType.SERVER_COMMAND, "s")).toBe(
      false,
    );
    expect(
      canRunAction(operator, SchedulerActionType.SERVER_COMMAND, "s"),
    ).toBe(true);
  });

  test("power actions need power write, backups need backups write", () => {
    const u = userWith({ ...scheduler, [AccessArea.POWER]: "write" });
    expect(canRunAction(u, SchedulerActionType.SERVER_RESTART, "s")).toBe(true);
    expect(canRunAction(u, SchedulerActionType.BACKUP_CREATE, "s")).toBe(false);
  });

  test("a webhook only needs the scheduler, but on a reachable server", () => {
    const u = userWith(scheduler, {
      serversRestrict: { enabled: true, allowed: ["mine"] },
    });
    expect(canRunAction(u, SchedulerActionType.HTTP_WEBHOOK, "mine")).toBe(
      true,
    );
    expect(canRunAction(u, SchedulerActionType.HTTP_WEBHOOK, "other")).toBe(
      false,
    );
    expect(
      canRunAction(userWith({}), SchedulerActionType.HTTP_WEBHOOK, "mine"),
    ).toBe(false);
  });
});
