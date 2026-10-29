import { describe, expect, test } from "bun:test";
import { ForbiddenException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { HttpArgumentsHost } from "@nestjs/common/interfaces";
import { AccessArea, AREA_LEVELS } from "@shared/access/areas";
import { fake } from "@/testing/fake";
import { AdminGuard } from "./admin.guard";

function context(request: Record<string, unknown>): ExecutionContext {
  return fake<ExecutionContext>({
    switchToHttp: () =>
      fake<HttpArgumentsHost>({ getRequest: <T>() => request as T }),
  });
}

const guard = new AdminGuard();

describe("AdminGuard", () => {
  test("admin passes", () => {
    expect(guard.canActivate(context({ user: { isAdmin: true } }))).toBe(true);
  });

  test("user with every area at its top level but no admin flag is a 403", () => {
    const user = {
      isAdmin: false,
      access: {
        levels: Object.fromEntries(
          Object.values(AccessArea).map((area) => [
            area,
            AREA_LEVELS[area].at(-1),
          ]),
        ),
        ext: [],
      },
    };

    expect(() => guard.canActivate(context({ user }))).toThrow(
      "Admin privileges required",
    );
  });

  test("missing admin flag counts as not admin", () => {
    expect(() => guard.canActivate(context({ user: {} }))).toThrow(
      ForbiddenException,
    );
  });

  test("unauthenticated request is a 403", () => {
    expect(() => guard.canActivate(context({}))).toThrow(
      "User not authenticated",
    );
  });
});
