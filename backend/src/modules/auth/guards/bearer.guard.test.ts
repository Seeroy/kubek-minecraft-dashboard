import { beforeEach, describe, expect, test } from "bun:test";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext, Type } from "@nestjs/common";
import type { HttpArgumentsHost } from "@/testing/http-host";
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
import { apiKeysService } from "@/testing/api-keys";
import type { ApiKeysService } from "@/modules/api-keys/api-keys.service";
import { AccessArea } from "@shared/access/areas";
import type { IUser } from "@shared/types/user.types";
import { Public } from "../decorators/public.decorator";
import { SessionOnly } from "../decorators/session-only.decorator";
import { BearerAuthGuard } from "./bearer.guard";

class Routes {
  privatePage() {}

  @Public()
  publicPage() {}

  @SessionOnly()
  ownAccount() {}
}

@Public()
class PublicRoutes {
  page() {}
}

interface TestRequest {
  headers: Record<string, string>;
  user?: IUser;
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
let keys: ApiKeysService;
let alice: IUser;
let guard: BearerAuthGuard;

beforeEach(() => {
  const sqlite = sqliteProvider();
  const users = new UsersRepository(sqlite);
  alice = testUser("alice", {
    grants: {
      [AccessArea.CONSOLE]: "write",
      [AccessArea.FILES]: "read",
      [AccessArea.API]: "write",
    },
  });
  users.create(alice);
  sessions = new SessionsService(
    new UserSessionsRepository(sqlite),
    new AccountsService(users),
    new ExtensionEventBus(new ServersRepository(sqlite)),
    new AppEventsService(),
  );
  keys = apiKeysService(sqlite, users);
  guard = new BearerAuthGuard(sessions, keys, new Reflector());
});

const keyHeader = (token: string) => ({ authorization: `Bearer ${token}` });

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

describe("BearerAuthGuard with an API key", () => {
  const create = (grants: Record<string, string>, expiresAt?: number) =>
    keys.create(alice, {
      name: "ci",
      grants,
      servers: null,
      mcp: false,
      expiresAt,
    });

  test("the user is cut down to the key and has no session", () => {
    const { token, key } = create({
      [AccessArea.CONSOLE]: "read",
      [AccessArea.FILES]: "read",
    });
    const request: TestRequest = { headers: keyHeader(token) };

    expect(guard.canActivate(context(request))).toBe(true);
    expect(request.user?.id).toBe("alice");
    expect(request.user?.apiKey?.id).toBe(key.id);
    expect(request.user?.access.levels).toEqual({
      [AccessArea.CONSOLE]: "read",
      [AccessArea.FILES]: "read",
    });
    expect(request.session).toBeUndefined();
  });

  test("session only routes refuse a key", () => {
    const { token } = create({ [AccessArea.CONSOLE]: "read" });

    expect(() =>
      guard.canActivate(
        context({ headers: keyHeader(token) }, Routes.prototype.ownAccount),
      ),
    ).toThrow(ForbiddenException);
  });

  test("an unknown key is a 401", () => {
    expect(() =>
      guard.canActivate(context({ headers: keyHeader("kbk_nope") })),
    ).toThrow("Invalid API key");
  });

  test("a deleted key stops working", () => {
    const { token, key } = create({ [AccessArea.CONSOLE]: "read" });
    keys.delete(alice, key.id);

    expect(() =>
      guard.canActivate(context({ headers: keyHeader(token) })),
    ).toThrow(UnauthorizedException);
  });

  test("a key can't be made above its owner", () => {
    expect(() => create({ [AccessArea.FILES]: "manage" })).toThrow(
      ForbiddenException,
    );
    expect(() => create({ [AccessArea.API]: "write" })).toThrow(
      ForbiddenException,
    );
  });
});
