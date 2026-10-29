import { beforeEach, describe, expect, test } from "bun:test";
import { UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext, Type } from "@nestjs/common";
import type { HttpArgumentsHost } from "@nestjs/common/interfaces";
import { Reflector } from "@nestjs/core";
import { AppEventsService } from "@/core/events/app-events.service";
import { testUser } from "@/testing/user";
import { AccountsService } from "@/modules/accounts/accounts.service";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { UserSessionsRepository } from "@/modules/database/repositories/user-sessions.repository";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import { SessionsService } from "@/modules/sessions/sessions.service";
import { fake } from "@/testing/fake";
import { sqliteProvider } from "@/testing/sqlite";
import { Public } from "../decorators/public.decorator";
import { BearerAuthGuard } from "./bearer.guard";

class Routes {
  privatePage() {}

  @Public()
  publicPage() {}
}

@Public()
class PublicRoutes {
  page() {}
}

interface TestRequest {
  headers: Record<string, string>;
  user?: { id: string };
  session?: { id: string };
}

function context(
  request: TestRequest,
  handler: () => void = Routes.prototype.privatePage,
  cls: Type = Routes,
): ExecutionContext {
  return fake<ExecutionContext>({
    getHandler: () => handler,
    getClass: () => cls,
    switchToHttp: () =>
      fake<HttpArgumentsHost>({ getRequest: <T>() => request as T }),
  });
}

let sessions: SessionsService;
let guard: BearerAuthGuard;

beforeEach(() => {
  const sqlite = sqliteProvider();
  const users = new UsersRepository(sqlite);
  users.create(testUser("alice"));
  sessions = new SessionsService(
    new UserSessionsRepository(sqlite),
    new AccountsService(users),
    new ExtensionEventBus(new ServersRepository(sqlite)),
    new AppEventsService(),
  );
  guard = new BearerAuthGuard(sessions, new Reflector());
});

describe("BearerAuthGuard", () => {
  test("valid token attaches the user and session to the request", () => {
    const { token, session } = sessions.create("alice", null, null);
    const request: TestRequest = {
      headers: { authorization: `Bearer ${token}` },
    };

    expect(guard.canActivate(context(request))).toBe(true);
    expect(request.user?.id).toBe("alice");
    expect(request.session?.id).toBe(session.id);
  });

  test("scheme is matched case-insensitively", () => {
    const { token } = sessions.create("alice", null, null);

    expect(
      guard.canActivate(
        context({ headers: { authorization: `bearer ${token}` } }),
      ),
    ).toBe(true);
  });

  test("missing header is a 401", () => {
    expect(() => guard.canActivate(context({ headers: {} }))).toThrow(
      "Invalid Authorization header",
    );
  });

  test("malformed header is a 401", () => {
    const { token } = sessions.create("alice", null, null);

    for (const header of ["Bearer", "Bearer ", token, `Basic ${token}`]) {
      expect(() =>
        guard.canActivate(context({ headers: { authorization: header } })),
      ).toThrow(UnauthorizedException);
    }
  });

  test("unknown token is a 401", () => {
    expect(() =>
      guard.canActivate(
        context({ headers: { authorization: `Bearer ${"0".repeat(64)}` } }),
      ),
    ).toThrow("Invalid token");
  });

  test("revoked session token is a 401", () => {
    const { token, session } = sessions.create("alice", null, null);
    sessions.revoke(session.id);

    expect(() =>
      guard.canActivate(
        context({ headers: { authorization: `Bearer ${token}` } }),
      ),
    ).toThrow(UnauthorizedException);
  });

  test("public handler passes without a token and stays anonymous", () => {
    const request: TestRequest = { headers: {} };

    expect(
      guard.canActivate(context(request, Routes.prototype.publicPage)),
    ).toBe(true);
    expect(request.user).toBeUndefined();
  });

  test("public controller passes without a token", () => {
    expect(
      guard.canActivate(
        context({ headers: {} }, PublicRoutes.prototype.page, PublicRoutes),
      ),
    ).toBe(true);
  });
});
