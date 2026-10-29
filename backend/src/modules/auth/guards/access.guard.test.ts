import { describe, expect, test } from "bun:test";
import { ForbiddenException } from "@nestjs/common";
import type { ExecutionContext, Type } from "@nestjs/common";
import type { HttpArgumentsHost } from "@nestjs/common/interfaces";
import { Reflector } from "@nestjs/core";
import { AccessArea, type AccessMap } from "@shared/access/areas";
import type { IUser } from "@shared/types/user.types";
import { fake } from "@/testing/fake";
import {
  RequireAccess,
  RequireServerView,
} from "../decorators/require-access.decorator";
import { AccessGuard } from "./access.guard";

class Routes {
  open() {}

  @RequireAccess(AccessArea.FILES, "read")
  read() {}

  @RequireAccess(AccessArea.FILES, "manage")
  remove() {}

  @RequireServerView()
  servers() {}
}

@RequireAccess(AccessArea.AUDIT, "read")
class AuditRoutes {
  list() {}

  @RequireAccess(AccessArea.AUDIT, "manage")
  rotate() {}
}

function user(levels: AccessMap, isAdmin = false): IUser {
  return fake<IUser>({ isAdmin, access: { levels, ext: [] } });
}

function run(cls: Type, handler: () => void, who?: IUser): boolean {
  return new AccessGuard(new Reflector()).canActivate(
    fake<ExecutionContext>({
      getHandler: () => handler,
      getClass: () => cls,
      switchToHttp: () =>
        fake<HttpArgumentsHost>({ getRequest: <T>() => ({ user: who }) as T }),
    }),
  );
}

describe("AccessGuard", () => {
  test("routes without a requirement pass", () => {
    expect(run(Routes, Routes.prototype.open, user({}))).toBe(true);
  });

  test("a higher level covers a lower one", () => {
    const writer = user({ [AccessArea.FILES]: "write" });
    expect(run(Routes, Routes.prototype.read, writer)).toBe(true);
    expect(() => run(Routes, Routes.prototype.remove, writer)).toThrow(
      ForbiddenException,
    );
  });

  test("a level in another area doesn't count", () => {
    expect(() =>
      run(
        Routes,
        Routes.prototype.read,
        user({ [AccessArea.CONSOLE]: "write" }),
      ),
    ).toThrow(ForbiddenException);
  });

  test("admins pass everything", () => {
    expect(run(Routes, Routes.prototype.remove, user({}, true))).toBe(true);
  });

  test("no user is refused", () => {
    expect(() => run(Routes, Routes.prototype.read)).toThrow(
      ForbiddenException,
    );
  });

  test("a handler level replaces the class one", () => {
    const reader = user({ [AccessArea.AUDIT]: "read" });
    expect(run(AuditRoutes, AuditRoutes.prototype.list, reader)).toBe(true);
    expect(() =>
      run(AuditRoutes, AuditRoutes.prototype.rotate, reader),
    ).toThrow(ForbiddenException);
  });

  test("any server area at read lets servers be seen", () => {
    const servers = Routes.prototype.servers;
    expect(run(Routes, servers, user({ [AccessArea.FILES]: "read" }))).toBe(
      true,
    );
    expect(() =>
      run(Routes, servers, user({ [AccessArea.AUDIT]: "manage" })),
    ).toThrow(ForbiddenException);
  });
});
