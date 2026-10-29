import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  Controller,
  Get,
  type INestApplication,
  UseGuards,
} from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import type { SubnetsAccess } from "@shared/types/configs/mainConfig.types";
import { AccessArea, type AccessMap } from "@shared/access/areas";
import type { IUser } from "@shared/types/user.types";
import * as bcrypt from "bcryptjs";
import type { AddressInfo } from "net";
import { AppEventsService } from "@/core/events/app-events.service";
import { BadResponseFilter } from "@/core/middlewares/badResponseFilter";
import { validationPipe } from "@/core/middlewares/validationPipe";
import type { IConfiguration } from "@/core/types/config";
import { AccountsService } from "@/modules/accounts/accounts.service";
import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import { ConfigService } from "@/modules/config/config.service";
import { AuditLogsRepository } from "@/modules/database/repositories/audit-logs.repository";
import { AuthChallengesRepository } from "@/modules/database/repositories/auth-challenges.repository";
import { ConfigRepository } from "@/modules/database/repositories/config.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { TelegramUsersRepository } from "@/modules/database/repositories/telegram-users.repository";
import { UserSessionsRepository } from "@/modules/database/repositories/user-sessions.repository";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import { PasswordRecheckService } from "@/modules/rate-limit/password-recheck.service";
import { RateLimitService } from "@/modules/rate-limit/rate-limit.service";
import { SessionsController } from "@/modules/sessions/sessions.controller";
import { SessionsService } from "@/modules/sessions/sessions.service";
import { BotTwofaService } from "@/modules/telegram-bot/bot-twofa.service";
import { fake } from "@/testing/fake";
import { sqliteProvider } from "@/testing/sqlite";
import { testUser } from "@/testing/user";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { Public } from "./decorators/public.decorator";
import {
  RequireAccess,
  RequireServerView,
} from "./decorators/require-access.decorator";
import { AdminGuard } from "./guards/admin.guard";
import { BearerAuthGuard } from "./guards/bearer.guard";
import { AccessGuard } from "./guards/access.guard";
import { SubnetGuard } from "./guards/subnet.guard";
import { TwofaService } from "./twofa/twofa.service";

const PASSWORD = "correct horse";

@Controller("api/probe")
@UseGuards(BearerAuthGuard, AccessGuard)
class ProbeController {
  @Get("public")
  @Public()
  open() {
    return { ok: "public" };
  }

  @Get("servers")
  @RequireServerView()
  servers() {
    return { ok: "servers" };
  }

  @Get("files/read")
  @RequireAccess(AccessArea.FILES, "read")
  filesRead() {
    return { ok: "files read" };
  }

  @Get("files/write")
  @RequireAccess(AccessArea.FILES, "write")
  filesWrite() {
    return { ok: "files write" };
  }

  @Get("files/manage")
  @RequireAccess(AccessArea.FILES, "manage")
  filesManage() {
    return { ok: "files manage" };
  }

  @Get("audit")
  @RequireAccess(AccessArea.AUDIT, "read")
  audit() {
    return { ok: "audit" };
  }

  @Get("audit/manage")
  @RequireAccess(AccessArea.AUDIT, "manage")
  auditManage() {
    return { ok: "audit manage" };
  }

  @Get("admin")
  @UseGuards(AdminGuard)
  admin() {
    return { ok: "admin" };
  }
}

let app: INestApplication;
let base: string;
let sessions: SessionsService;
let subnets: SubnetsAccess = { enabled: false };

function account(
  id: string,
  grants: AccessMap = {},
  extra: Partial<IUser> = {},
): IUser {
  return testUser(id, {
    password: bcrypt.hashSync(PASSWORD, 4),
    grants,
    ...extra,
  });
}

function get(path: string, token?: string): Promise<Response> {
  return fetch(`${base}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

async function login(username: string): Promise<string> {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password: PASSWORD }),
  });
  expect(res.status).toBe(200);
  const body = (await res.json()) as { token: string };
  return body.token;
}

beforeAll(async () => {
  const sqlite = sqliteProvider();
  const users = new UsersRepository(sqlite);
  const accounts = new AccountsService(users);
  const servers = new ServersRepository(sqlite);
  const events = new AppEventsService();
  const rateLimit = new RateLimitService(
    events,
    new AuditLogService(new AuditLogsRepository(sqlite), servers),
  );
  sessions = new SessionsService(
    new UserSessionsRepository(sqlite),
    accounts,
    new ExtensionEventBus(servers),
    events,
  );
  const twofa = new TwofaService(
    new AuthChallengesRepository(sqlite),
    new TelegramUsersRepository(sqlite),
    accounts,
    sessions,
    fake<BotTwofaService>({ setTwofaResolver: () => {} }),
    new ConfigService(new ConfigRepository(sqlite)),
    rateLimit,
    new PasswordRecheckService(rateLimit),
  );

  users.create(account("viewer", { [AccessArea.CONSOLE]: "read" }));
  users.create(account("backups", { [AccessArea.BACKUPS]: "read" }));
  users.create(account("reader", { [AccessArea.FILES]: "read" }));
  users.create(account("writer", { [AccessArea.FILES]: "write" }));
  users.create(account("keeper", { [AccessArea.FILES]: "manage" }));
  users.create(account("auditor", { [AccessArea.AUDIT]: "read" }));
  users.create(account("nobody"));
  users.create(account("admin", {}, { isAdmin: true }));

  const moduleRef = await Test.createTestingModule({
    controllers: [AuthController, SessionsController, ProbeController],
    providers: [
      { provide: AuthService, useValue: new AuthService(accounts) },
      { provide: SessionsService, useValue: sessions },
      { provide: RateLimitService, useValue: rateLimit },
      { provide: TwofaService, useValue: twofa },
      {
        provide: ConfigService,
        useValue: fake<ConfigService>({
          getAll: () =>
            fake<IConfiguration>({ subnetsAccessRestriction: subnets }),
        }),
      },
      { provide: APP_GUARD, useClass: SubnetGuard },
    ],
  }).compile();

  app = moduleRef.createNestApplication({ logger: false });
  app.useGlobalFilters(new BadResponseFilter());
  app.useGlobalPipes(validationPipe);
  await app.listen(0, "127.0.0.1");
  const { port } = app.getHttpServer().address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await app?.close();
});

describe("RBAC over HTTP", () => {
  test("protected route without a token is 401", async () => {
    expect((await get("/api/probe/servers")).status).toBe(401);
    expect((await get("/api/sessions")).status).toBe(401);
  });

  test("garbage token is 401", async () => {
    expect((await get("/api/probe/servers", "nope")).status).toBe(401);
  });

  test("public route works without a token", async () => {
    const res = await get("/api/probe/public");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: "public" });
  });

  test("route needing a missing level is 403", async () => {
    const token = await login("nobody");

    expect((await get("/api/probe/servers", token)).status).toBe(403);
    expect((await get("/api/probe/files/read", token)).status).toBe(403);
  });

  test("read in any server area is enough to see servers", async () => {
    for (const username of ["viewer", "backups", "reader"]) {
      const token = await login(username);

      const res = await get("/api/probe/servers", token);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: "servers" });
    }
  });

  test("a panel area alone doesn't show servers", async () => {
    const token = await login("auditor");

    expect((await get("/api/probe/servers", token)).status).toBe(403);
    expect((await get("/api/probe/audit", token)).status).toBe(200);
  });

  test("files read opens reading but not writing or deleting", async () => {
    const token = await login("reader");

    expect((await get("/api/probe/files/read", token)).status).toBe(200);
    expect((await get("/api/probe/files/write", token)).status).toBe(403);
    expect((await get("/api/probe/files/manage", token)).status).toBe(403);
  });

  test("files write includes read but not manage", async () => {
    const token = await login("writer");

    expect((await get("/api/probe/files/read", token)).status).toBe(200);
    expect((await get("/api/probe/files/write", token)).status).toBe(200);
    expect((await get("/api/probe/files/manage", token)).status).toBe(403);
  });

  test("files manage opens every files route and nothing else", async () => {
    const token = await login("keeper");

    expect((await get("/api/probe/files/read", token)).status).toBe(200);
    expect((await get("/api/probe/files/write", token)).status).toBe(200);
    expect((await get("/api/probe/files/manage", token)).status).toBe(200);
    expect((await get("/api/probe/audit", token)).status).toBe(403);
  });

  test("audit read can't rotate the log", async () => {
    const token = await login("auditor");

    expect((await get("/api/probe/audit/manage", token)).status).toBe(403);
  });

  test("route without a required level only needs a session", async () => {
    const token = await login("nobody");

    const res = await get("/api/auth/profile", token);

    expect(res.status).toBe(200);
    expect(((await res.json()) as { username: string }).username).toBe(
      "nobody",
    );
  });

  test("admin passes every level check and the admin guard", async () => {
    const token = await login("admin");

    expect((await get("/api/probe/servers", token)).status).toBe(200);
    expect((await get("/api/probe/files/manage", token)).status).toBe(200);
    expect((await get("/api/probe/audit/manage", token)).status).toBe(200);
    expect((await get("/api/probe/admin", token)).status).toBe(200);
  });

  test("admin only route is 403 for a regular user", async () => {
    const token = await login("viewer");

    expect((await get("/api/probe/admin", token)).status).toBe(403);
  });

  test("token stops working after logout", async () => {
    const token = await login("viewer");

    const logout = await fetch(`${base}/api/auth/logout`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(logout.status).toBe(204);
    expect((await get("/api/probe/servers", token)).status).toBe(401);
  });

  test("wrong password is 401 over HTTP", async () => {
    const res = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "viewer", password: "wrong password" }),
    });

    expect(res.status).toBe(401);
  });

  test("valid token from outside the allowed subnets is 403", async () => {
    const token = await login("viewer");
    subnets = { enabled: true, subnets: ["10.0.0.0/8"] };
    try {
      expect((await get("/api/probe/servers", token)).status).toBe(403);
      expect((await get("/api/probe/public")).status).toBe(200);
    } finally {
      subnets = { enabled: false };
    }
  });
});
