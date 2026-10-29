import { describe, expect, test } from "bun:test";
import { ForbiddenException } from "@nestjs/common";
import type { ExecutionContext, Type } from "@nestjs/common";
import type { HttpArgumentsHost } from "@nestjs/common/interfaces";
import { Reflector } from "@nestjs/core";
import { AccessArea, type AccessMap } from "@shared/access/areas";
import type { Request } from "express";
import { readAuditNote } from "@/modules/audit-log/audit.decorator";
import { AccessGuard } from "@/modules/auth/guards/access.guard";
import { AppEventsService } from "@/core/events/app-events.service";
import { RolesRepository } from "@/modules/database/repositories/roles.repository";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { fake } from "@/testing/fake";
import { sqliteProvider } from "@/testing/sqlite";
import { testUser, userWith } from "@/testing/user";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";

type Handler = keyof RolesController;
const routes: Type = RolesController;

function allowed(handler: Handler, levels: AccessMap): boolean {
  const user = userWith(levels);
  try {
    return new AccessGuard(new Reflector()).canActivate(
      fake<ExecutionContext>({
        getHandler: () => RolesController.prototype[handler],
        getClass: () => routes,
        switchToHttp: () =>
          fake<HttpArgumentsHost>({ getRequest: <T>() => ({ user }) as T }),
      }),
    );
  } catch (e) {
    if (e instanceof ForbiddenException) return false;
    throw e;
  }
}

describe("RolesController access", () => {
  test("listing and reading roles needs accounts read", () => {
    for (const handler of ["list", "get"] as const) {
      expect(allowed(handler, {})).toBe(false);
      expect(allowed(handler, { [AccessArea.ACCOUNTS]: "read" })).toBe(true);
    }
  });

  test("changing roles needs accounts manage", () => {
    for (const handler of [
      "create",
      "update",
      "remove",
      "duplicate",
    ] as const) {
      expect(allowed(handler, { [AccessArea.ACCOUNTS]: "write" })).toBe(false);
      expect(allowed(handler, { [AccessArea.ACCOUNTS]: "manage" })).toBe(true);
    }
  });
});

const rolesWithUsers = () => {
  const sqlite = sqliteProvider();
  return new RolesService(
    new RolesRepository(sqlite),
    new UsersRepository(sqlite),
    new AppEventsService(),
  );
};

describe("RolesController responses", () => {
  const controller = new RolesController(rolesWithUsers());
  const admin = testUser("admin", { isAdmin: true });

  test("built-in roles are marked in the list", () => {
    const viewer = controller.list().find((r) => r.id === "builtin:viewer");

    expect(viewer).toMatchObject({
      builtin: true,
      builtinKey: "viewer",
      members: 0,
    });
  });

  test("an update notes the changed levels for the audit log", () => {
    const req = fake<Request>({});
    const role = controller.create(
      { name: "Builders", grants: { [AccessArea.FILES]: "read" } },
      admin,
    );

    controller.update(
      role.id,
      { grants: { [AccessArea.FILES]: "write" }, ext: ["ext.map"] },
      admin,
      req,
    );

    expect(readAuditNote(req)).toMatchObject({
      resourceName: "Builders",
      changes: [
        { field: "grants.files", from: "read", to: "write" },
        { field: "ext", from: [], to: ["ext.map"] },
      ],
    });
  });
});
