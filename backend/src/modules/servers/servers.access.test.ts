import { describe, expect, test } from "bun:test";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { FilesController } from "@/modules/files/files.controller";
import { PlayersController } from "@/modules/players/players.controller";
import { fake } from "@/testing/fake";
import { userWith } from "@/testing/user";
import type { ExecutionContext, Type } from "@nestjs/common";
import type { HttpArgumentsHost } from "@nestjs/common/interfaces";
import { Reflector } from "@nestjs/core";
import { AccessArea, type AccessMap } from "@shared/access/areas";
import { ServerSettingsController } from "./server-settings.controller";
import { ServersController } from "./servers.controller";

function allowed<T>(cls: Type<T>, handler: keyof T, levels: AccessMap) {
  const target: Type = cls;
  const guard = new AccessGuard(new Reflector());
  const user = userWith(levels);
  try {
    return guard.canActivate(
      fake<ExecutionContext>({
        getHandler: () => cls.prototype[handler],
        getClass: () => target,
        switchToHttp: () =>
          fake<HttpArgumentsHost>({ getRequest: <R>() => ({ user }) as R }),
      }),
    );
  } catch {
    return false;
  }
}

describe("server routes access", () => {
  test("power read sees servers but can't start them", () => {
    const viewer = { [AccessArea.POWER]: "read" } as const;
    expect(allowed(ServersController, "getAll", viewer)).toBe(true);
    expect(allowed(ServersController, "getById", viewer)).toBe(true);
    expect(allowed(ServersController, "start", viewer)).toBe(false);
  });

  test("power write starts and stops, kill needs manage", () => {
    const operator = { [AccessArea.POWER]: "write" } as const;
    expect(allowed(ServersController, "start", operator)).toBe(true);
    expect(allowed(ServersController, "stop", operator)).toBe(true);
    expect(allowed(ServersController, "kill", operator)).toBe(false);
    expect(
      allowed(ServersController, "kill", { [AccessArea.POWER]: "manage" }),
    ).toBe(true);
  });

  test("settings read, write and manage split properties, saving and deleting", () => {
    const read = { [AccessArea.SETTINGS]: "read" } as const;
    const write = { [AccessArea.SETTINGS]: "write" } as const;
    expect(allowed(ServerSettingsController, "getProperties", read)).toBe(true);
    expect(allowed(ServerSettingsController, "updateSettings", read)).toBe(
      false,
    );
    expect(allowed(ServerSettingsController, "updateSettings", write)).toBe(
      true,
    );
    expect(allowed(ServersController, "remove", write)).toBe(false);
    expect(
      allowed(ServersController, "remove", { [AccessArea.SETTINGS]: "manage" }),
    ).toBe(true);
  });

  test("creating a server needs servers write, not a server area", () => {
    expect(
      allowed(ServersController, "create", { [AccessArea.SETTINGS]: "manage" }),
    ).toBe(false);
    expect(
      allowed(ServersController, "create", { [AccessArea.SERVERS]: "write" }),
    ).toBe(true);
  });

  test("an account with no server area can't list servers", () => {
    expect(
      allowed(ServersController, "getAll", { [AccessArea.JAVA]: "manage" }),
    ).toBe(false);
  });

  test("files read browses, write edits, manage deletes", () => {
    const read = { [AccessArea.FILES]: "read" } as const;
    const write = { [AccessArea.FILES]: "write" } as const;
    expect(allowed(FilesController, "readFile", read)).toBe(true);
    expect(allowed(FilesController, "writeFile", read)).toBe(false);
    expect(allowed(FilesController, "writeFile", write)).toBe(true);
    expect(allowed(FilesController, "deleteFile", write)).toBe(false);
    expect(
      allowed(FilesController, "deleteFile", { [AccessArea.FILES]: "manage" }),
    ).toBe(true);
  });

  test("players write kicks and whitelists, bans need manage", () => {
    const write = { [AccessArea.PLAYERS]: "write" } as const;
    expect(allowed(PlayersController, "addToWhitelist", write)).toBe(true);
    expect(allowed(PlayersController, "removeBan", write)).toBe(false);
    expect(
      allowed(PlayersController, "removeBan", {
        [AccessArea.PLAYERS]: "manage",
      }),
    ).toBe(true);
  });
});
