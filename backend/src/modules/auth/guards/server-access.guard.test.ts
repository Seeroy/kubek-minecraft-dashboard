import { describe, expect, test } from "bun:test";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { ExecutionContext } from "@nestjs/common";
import type { HttpArgumentsHost } from "@nestjs/common/interfaces";
import { fake } from "@/testing/fake";
import { requestServerId, ServerAccessGuard } from "./server-access.guard";

const restricted = {
  isAdmin: false,
  serversRestrict: { enabled: true, allowed: ["mine"] },
};

function context(request: Record<string, unknown>): ExecutionContext {
  return fake<ExecutionContext>({
    getHandler: () => () => undefined,
    getClass: <T>() => class {} as T,
    switchToHttp: () =>
      fake<HttpArgumentsHost>({ getRequest: <T>() => request as T }),
  });
}

function guard(field: string | undefined) {
  const reflector = fake<Reflector>({
    getAllAndOverride: <T>() => field as T,
  });
  return new ServerAccessGuard(reflector);
}

const run = (field: string | undefined, request: Record<string, unknown>) =>
  guard(field).canActivate(context({ user: restricted, ...request }));

describe("ServerAccessGuard", () => {
  test("allowed id in one source passes", () => {
    expect(run("serverId", { params: { serverId: "mine" } })).toBe(true);
    expect(run("serverId", { query: { serverId: "mine" } })).toBe(true);
    expect(run("serverId", { body: { serverId: "mine" } })).toBe(true);
  });

  test("same id in several sources passes", () => {
    expect(
      run("serverId", {
        params: { serverId: "mine" },
        body: { serverId: "mine" },
      }),
    ).toBe(true);
  });

  test("query and body disagreeing is rejected", () => {
    expect(() =>
      run("serverId", {
        query: { serverId: "mine" },
        body: { serverId: "foreign" },
      }),
    ).toThrow(BadRequestException);
  });

  test("conflict is rejected for admins too", () => {
    expect(() =>
      guard("serverId").canActivate(
        context({
          user: { isAdmin: true },
          params: { serverId: "a" },
          body: { serverId: "b" },
        }),
      ),
    ).toThrow(BadRequestException);
  });

  test("non string ids are rejected", () => {
    expect(() =>
      run("serverId", { query: { serverId: ["mine", "foreign"] } }),
    ).toThrow(BadRequestException);
    expect(() => run("serverId", { body: { serverId: { $ne: 1 } } })).toThrow(
      BadRequestException,
    );
  });

  test("foreign or missing id is refused", () => {
    expect(() => run("serverId", { body: { serverId: "foreign" } })).toThrow(
      ForbiddenException,
    );
    expect(() => run("serverId", {})).toThrow(BadRequestException);
  });

  test("handlers without the decorator are left to their own checks", () => {
    expect(run(undefined, { body: { serverId: "foreign" } })).toBe(true);
  });

  test("dotted body path takes part in the check", () => {
    expect(run("server.id", { body: { server: { id: "mine" } } })).toBe(true);
    expect(() =>
      run("server.id", { body: { server: { id: "foreign" } } }),
    ).toThrow(ForbiddenException);
  });

  test("requestServerId gives null on conflict", () => {
    expect(
      requestServerId(
        { query: { serverId: "a" }, body: { serverId: "b" } },
        "serverId",
      ),
    ).toBeNull();
    expect(requestServerId({ params: { id: "a" } }, "id")).toBe("a");
  });
});
